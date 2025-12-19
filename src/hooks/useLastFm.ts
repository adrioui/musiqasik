import { useState, useCallback } from 'react';
import { Effect, Layer, ManagedRuntime } from 'effect';
import type { Artist, GraphData } from '@/types/artist';
import {
  LastFmService,
  LastFmServiceLive,
  DatabaseService,
  DatabaseServiceLive,
  GraphService,
  GraphServiceLive,
  ConfigLive,
} from '@/services';
import { SurrealLive } from '@/integrations/surrealdb/client';

// Build layers with proper dependency order
// LastFm only needs Config (for API key)
const LastFmLayer = Layer.provide(LastFmServiceLive, ConfigLive);

// Database needs Surreal client
const DatabaseLayer = Layer.provide(DatabaseServiceLive, SurrealLive);

// Graph needs both LastFm and Database
const ServiceLayers = Layer.mergeAll(LastFmLayer, DatabaseLayer);
const GraphLayer = Layer.provide(GraphServiceLive, ServiceLayers);

// Full layer for graph operations (requires DB)
const FullLive = Layer.mergeAll(LastFmLayer, DatabaseLayer, GraphLayer);

// Minimal layer for search (only needs LastFm, no DB required)
const SearchLive = LastFmLayer;

// Lazy runtime initialization - separate runtimes for different needs
type SearchRuntimeType = ManagedRuntime.ManagedRuntime<LastFmService, unknown>;
type FullRuntimeType = ManagedRuntime.ManagedRuntime<
  LastFmService | DatabaseService | GraphService,
  unknown
>;

let searchRuntime: SearchRuntimeType | null = null;
let fullRuntime: FullRuntimeType | null = null;
let searchRuntimePromise: Promise<SearchRuntimeType | null> | null = null;
let fullRuntimePromise: Promise<FullRuntimeType | null> | null = null;

// Get runtime for search operations (minimal, just LastFm)
const getSearchRuntime = async (): Promise<SearchRuntimeType | null> => {
  if (searchRuntime) {
    return searchRuntime;
  }

  if (!searchRuntimePromise) {
    searchRuntimePromise = (async () => {
      try {
        searchRuntime = ManagedRuntime.make(SearchLive);
        return searchRuntime;
      } catch (err) {
        console.warn('Search runtime initialization failed:', err);
        return null;
      }
    })();
  }

  return searchRuntimePromise;
};

// Get runtime for full operations (requires DB)
const getFullRuntime = async (): Promise<FullRuntimeType | null> => {
  if (fullRuntime) {
    return fullRuntime;
  }

  if (!fullRuntimePromise) {
    fullRuntimePromise = (async () => {
      try {
        fullRuntime = ManagedRuntime.make(FullLive);
        return fullRuntime;
      } catch (err) {
        console.warn('Full runtime initialization failed (DB may not be available):', err);
        return null;
      }
    })();
  }

  return fullRuntimePromise;
};

export function useLastFm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchArtists = useCallback(
    async (query: string, signal?: AbortSignal): Promise<Artist[]> => {
      if (!query.trim()) return [];

      setIsLoading(true);
      setError(null);

      try {
        const runtime = await getSearchRuntime();

        if (!runtime) {
          throw new Error('Search service not available. Check your API key configuration.');
        }

        const effect = Effect.gen(function* () {
          const lastFm = yield* LastFmService;
          return yield* lastFm.searchArtists(query);
        });

        // Handle abort signal
        if (signal) {
          return await new Promise<Artist[]>((resolve, reject) => {
            const abortHandler = () => {
              reject(new DOMException('Aborted', 'AbortError'));
            };
            signal.addEventListener('abort', abortHandler);
            runtime
              .runPromise(effect)
              .then(resolve)
              .catch(reject)
              .finally(() => {
                signal.removeEventListener('abort', abortHandler);
              });
          });
        }

        return await runtime.runPromise(effect);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          throw err;
        }
        const message = err instanceof Error ? err.message : 'Search failed';
        console.error('Search error:', err);
        setError(message);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const getGraph = useCallback(
    async (artistName: string, depth: number = 1): Promise<GraphData | null> => {
      if (!artistName.trim()) return null;

      setIsLoading(true);
      setError(null);

      try {
        const runtime = await getFullRuntime();

        if (!runtime) {
          // Fall back to search-only mode: build a simple graph from similar artists
          console.warn('Database not available, building graph from Last.fm only');
          return await buildGraphFromLastFmOnly(artistName, Math.min(depth, 2));
        }

        const effect = Effect.gen(function* () {
          const graph = yield* GraphService;
          return yield* graph.buildGraph(artistName, Math.min(depth, 3));
        });

        const result = await runtime.runPromise(effect);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch graph';
        console.error('Graph error:', err);
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const getArtist = useCallback(async (name: string): Promise<Artist | null> => {
    if (!name.trim()) return null;

    setIsLoading(true);
    setError(null);

    try {
      // Try full runtime first (with DB caching)
      const runtime = await getFullRuntime();

      if (runtime) {
        const effect = Effect.gen(function* () {
          const db = yield* DatabaseService;
          const lastFm = yield* LastFmService;

          // Try database first
          let artist = yield* db.getArtist(name);
          if (!artist) {
            // Fetch from Last.fm and cache
            const artistInfo = yield* lastFm.getArtistInfo(name);
            if (artistInfo) {
              artist = yield* db.upsertArtist(artistInfo);
            }
          }
          return artist;
        });

        return await runtime.runPromise(effect);
      }

      // Fall back to search runtime (just Last.fm, no caching)
      const searchRt = await getSearchRuntime();
      if (searchRt) {
        const effect = Effect.gen(function* () {
          const lastFm = yield* LastFmService;
          return yield* lastFm.getArtistInfo(name);
        });
        return await searchRt.runPromise(effect);
      }

      throw new Error('No runtime available');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch artist';
      console.error('Get artist error:', err);
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    searchArtists,
    getGraph,
    getArtist,
    isLoading,
    error,
  };
}

// Fallback graph builder using only Last.fm (no database)
async function buildGraphFromLastFmOnly(
  artistName: string,
  maxDepth: number
): Promise<GraphData | null> {
  const runtime = await getSearchRuntime();
  if (!runtime) return null;

  const visited = new Set<string>();
  const nodes: Artist[] = [];
  const edges: Array<{ source: string; target: string; weight: number }> = [];
  let center: Artist | null = null;

  const queue: Array<{ name: string; depth: number }> = [{ name: artistName, depth: 0 }];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const normalizedName = current.name.toLowerCase();

    if (visited.has(normalizedName)) continue;
    visited.add(normalizedName);

    try {
      // Get artist info
      const artistEffect = Effect.gen(function* () {
        const lastFm = yield* LastFmService;
        return yield* lastFm.getArtistInfo(current.name);
      });

      const artist = await runtime.runPromise(artistEffect);
      if (!artist) continue;

      nodes.push(artist);
      if (current.depth === 0) {
        center = artist;
      }

      // Get similar artists if not at max depth
      if (current.depth < maxDepth) {
        const similarEffect = Effect.gen(function* () {
          const lastFm = yield* LastFmService;
          return yield* lastFm.getSimilarArtists(current.name);
        });

        const similar = await runtime.runPromise(similarEffect);

        for (const sim of similar.slice(0, 10)) {
          edges.push({
            source: artist.name,
            target: sim.name,
            weight: sim.match,
          });

          if (!visited.has(sim.name.toLowerCase())) {
            queue.push({ name: sim.name, depth: current.depth + 1 });
          }
        }
      }
    } catch (err) {
      console.warn(`Failed to fetch artist ${current.name}:`, err);
      continue;
    }
  }

  return { nodes, edges, center };
}
