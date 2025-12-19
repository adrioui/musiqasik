# Effect Runtime Integration Implementation Plan

## Overview

Wire up the existing Effect services layer to replace the Workers API completely. The Effect services (`src/services/`) are already implemented but never executed - this plan connects them to the frontend and deletes the redundant Workers API.

## Current State Analysis

### Effect Services (Implemented but Unused)
- `src/services/lastfm.ts` - LastFmService with retry logic, Deezer fallback
- `src/services/database.ts` - DatabaseService with SurrealDB operations
- `src/services/index.ts` - Service type definitions and ConfigLive layer
- `src/integrations/surrealdb/client.ts` - SurrealClient connection layer
- `src/lib/errors.ts` - Effect error types (LastFmApiError, DatabaseError, NetworkError)

### Workers API (Currently Used, To Be Deleted)
- `workers/api/index.ts` - 477 lines duplicating Effect services
- Contains BFS graph building algorithm that needs to be ported to Effect

### Frontend Hook
- `src/hooks/useLastFm.ts` - Calls Workers API via fetch, needs to use Effect

### Key Discoveries
- Effect services define `searchArtists`, `getArtistInfo`, `getSimilarArtists` 
- DatabaseService has `getSimilarityGraph` but uses simple query, not BFS
- Workers API has sophisticated BFS with caching that must be preserved
- ConfigService reads from `process.env` which won't work in browser

## Desired End State

- Frontend calls Effect services directly (no Workers API)
- BFS graph building algorithm implemented as Effect service
- Effect runtime properly scoped per-request
- Workers directory deleted
- All existing functionality preserved

## What We're NOT Doing

- Changing the graph visualization (ForceGraph)
- Modifying the database schema
- Adding new features
- Optimizing the BFS algorithm (just porting it)

## Implementation Approach

1. Create browser-compatible Effect runtime
2. Port BFS algorithm to Effect-based GraphService
3. Create React hook that runs Effect programs
4. Replace useLastFm implementation
5. Delete Workers API

---

## Phase 1: Browser-Compatible Config Layer

### Overview
The current ConfigLive uses `process.env` which doesn't exist in browsers. Create a browser-compatible config that uses Vite's `import.meta.env`.

### Changes Required:

#### 1. Update ConfigService

**File**: `src/services/index.ts`
**Changes**: Make ConfigLive browser-compatible

```typescript
// Replace lines 52-62

export const ConfigLive = Layer.succeed(ConfigService, {
  lastFmApiKey: import.meta.env.VITE_LASTFM_API_KEY || '',
  surrealdbWsUrl: import.meta.env.VITE_SURREALDB_WS_URL || '',
  surrealdbHttpUrl: import.meta.env.VITE_SURREALDB_HTTP_URL || '',
  surrealdbNamespace: import.meta.env.VITE_SURREALDB_NAMESPACE || 'musiqasik',
  surrealdbDatabase: import.meta.env.VITE_SURREALDB_DATABASE || 'main',
  surrealdbUser: import.meta.env.VITE_SURREALDB_USER || '',
  surrealdbPass: import.meta.env.VITE_SURREALDB_PASS || '',
});
```

#### 2. Update SurrealDB Client for Browser

**File**: `src/integrations/surrealdb/client.ts`
**Changes**: Use import.meta.env consistently

```typescript
// Replace lines 7-26 with simpler browser-only config

const SURREALDB_URL = import.meta.env.VITE_SURREALDB_HTTP_URL || import.meta.env.VITE_SURREALDB_WS_URL;
const SURREALDB_NAMESPACE = import.meta.env.VITE_SURREALDB_NAMESPACE || 'musiqasik';
const SURREALDB_DATABASE = import.meta.env.VITE_SURREALDB_DATABASE || 'main';
const SURREALDB_USER = import.meta.env.VITE_SURREALDB_USER || '';
const SURREALDB_PASS = import.meta.env.VITE_SURREALDB_PASS || '';
```

#### 3. Add Vite env types

**File**: `src/vite-env.d.ts`
**Changes**: Add type declarations for env variables

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LASTFM_API_KEY: string;
  readonly VITE_SURREALDB_WS_URL: string;
  readonly VITE_SURREALDB_HTTP_URL: string;
  readonly VITE_SURREALDB_NAMESPACE: string;
  readonly VITE_SURREALDB_DATABASE: string;
  readonly VITE_SURREALDB_USER: string;
  readonly VITE_SURREALDB_PASS: string;
  readonly VITE_API_BASE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

### Success Criteria:

#### Automated Verification:
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds

#### Manual Verification:
- [ ] None yet - services not wired up

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding.

---

## Phase 2: Create GraphService with BFS Algorithm

### Overview
Port the BFS graph building algorithm from Workers API to an Effect-based GraphService.

### Changes Required:

#### 1. Create GraphService

**File**: `src/services/graph.ts` (new file)
**Changes**: Create new Effect service for graph building

```typescript
import { Effect, Context, Layer } from 'effect';
import { LastFmService, DatabaseService } from '@/services';
import type { Artist, GraphData } from '@/types/artist';
import type { AppError } from '@/lib/errors';

export class GraphService extends Context.Tag('GraphService')<
  GraphService,
  {
    buildGraph: (
      artistName: string,
      maxDepth: number
    ) => Effect.Effect<GraphData & { metrics?: { duration: number; nodeCount: number } }, AppError>;
  }
>() {}

const makeGraphService = Effect.gen(function* () {
  const lastFm = yield* LastFmService;
  const db = yield* DatabaseService;

  // Per-request cache
  const requestCache = new Map<string, Artist>();

  return GraphService.of({
    buildGraph: (artistName: string, maxDepth: number) =>
      Effect.gen(function* () {
        const startTime = Date.now();
        const visited = new Set<string>();
        const queue: Array<{ name: string; depth: number }> = [{ name: artistName, depth: 0 }];
        const nodes: Artist[] = [];
        const edges: Array<{ source: string; target: string; weight: number }> = [];
        let center: Artist | null = null;

        // Clear cache at start of request
        requestCache.clear();

        while (queue.length > 0) {
          const current = queue.shift()!;
          const normalizedName = current.name.toLowerCase();

          if (visited.has(normalizedName)) continue;
          visited.add(normalizedName);

          // Check cache first, then database
          let artist = requestCache.get(normalizedName);
          if (!artist) {
            artist = yield* db.getArtist(current.name);
          }

          if (!artist) {
            // Fetch from Last.fm
            const artistInfo = yield* lastFm.getArtistInfo(current.name);
            if (!artistInfo) continue;
            artist = yield* db.upsertArtist(artistInfo);
          }

          if (artist) {
            requestCache.set(normalizedName, artist);
            nodes.push(artist);

            if (current.depth === 0) {
              center = artist;
            }

            // Get similar artists if not at max depth
            if (current.depth < maxDepth) {
              // Check for cached edges first
              const cachedEdges = yield* db.getCachedEdges(artist.id!);

              if (cachedEdges.length > 0) {
                // Use cached edges
                for (const edge of cachedEdges) {
                  edges.push({
                    source: artist.name,
                    target: edge.target.name,
                    weight: edge.match_score,
                  });

                  if (!visited.has(edge.target.name.toLowerCase())) {
                    queue.push({ name: edge.target.name, depth: current.depth + 1 });
                  }
                }
              } else {
                // Fetch from Last.fm
                const similar = yield* lastFm.getSimilarArtists(current.name);

                // Process similar artists sequentially (Effect doesn't have built-in parallel limit)
                for (const sim of similar) {
                  const simNormalized = sim.name.toLowerCase();
                  
                  let targetArtist = requestCache.get(simNormalized);
                  if (!targetArtist) {
                    targetArtist = yield* db.getArtist(sim.name);
                  }

                  if (!targetArtist) {
                    const targetInfo = yield* lastFm.getArtistInfo(sim.name);
                    if (targetInfo) {
                      targetArtist = yield* db.upsertArtist(targetInfo);
                    }
                  }

                  if (targetArtist) {
                    requestCache.set(simNormalized, targetArtist);

                    // Create edge
                    yield* db.upsertEdges([{
                      source_artist_id: artist.id!,
                      target_artist_id: targetArtist.id!,
                      match_score: sim.match,
                      depth: current.depth + 1,
                    }]);

                    edges.push({
                      source: artist.name,
                      target: targetArtist.name,
                      weight: sim.match,
                    });

                    if (!visited.has(simNormalized)) {
                      queue.push({ name: sim.name, depth: current.depth + 1 });
                    }
                  }
                }
              }
            }
          }
        }

        const duration = Date.now() - startTime;

        return {
          nodes,
          edges,
          center,
          metrics: {
            duration,
            nodeCount: nodes.length,
          },
        };
      }),
  });
});

export const GraphServiceLive = Layer.effect(GraphService, makeGraphService);
```

#### 2. Export GraphService from services index

**File**: `src/services/index.ts`
**Changes**: Add export for GraphService

```typescript
// Add at top of file
export { GraphService, GraphServiceLive } from './graph';
```

### Success Criteria:

#### Automated Verification:
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds

#### Manual Verification:
- [ ] None yet - service not wired up

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding.

---

## Phase 3: Create Effect Runtime Hook

### Overview
Create a React hook that provides Effect runtime for running Effect programs in components.

### Changes Required:

#### 1. Create useEffectRuntime hook

**File**: `src/hooks/useEffectRuntime.ts` (new file)

```typescript
import { useRef, useCallback } from 'react';
import { Effect, Layer, Runtime, Scope } from 'effect';
import { LastFmService, LastFmServiceLive, DatabaseService, DatabaseServiceLive, ConfigLive, GraphService, GraphServiceLive } from '@/services';
import { SurrealLive } from '@/integrations/surrealdb/client';

// Compose all service layers
const MainLayer = Layer.mergeAll(
  ConfigLive,
  LastFmServiceLive,
  DatabaseServiceLive,
  GraphServiceLive
).pipe(
  Layer.provide(SurrealLive),
  Layer.provide(ConfigLive)
);

// Create runtime once (singleton)
let runtimePromise: Promise<Runtime.Runtime<LastFmService | DatabaseService | GraphService>> | null = null;

const getRuntime = () => {
  if (!runtimePromise) {
    runtimePromise = Effect.runPromise(
      Layer.toRuntime(MainLayer).pipe(
        Effect.scoped,
        Effect.map((runtime) => runtime)
      )
    );
  }
  return runtimePromise;
};

export function useEffectRuntime() {
  const runEffect = useCallback(
    async <A, E>(effect: Effect.Effect<A, E, LastFmService | DatabaseService | GraphService>): Promise<A> => {
      const runtime = await getRuntime();
      return Runtime.runPromise(runtime)(effect);
    },
    []
  );

  return { runEffect };
}
```

### Success Criteria:

#### Automated Verification:
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds

#### Manual Verification:
- [ ] None yet - hook not used

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding.

---

## Phase 4: Replace useLastFm Implementation

### Overview
Replace the current useLastFm hook to use Effect services instead of Workers API.

### Changes Required:

#### 1. Rewrite useLastFm

**File**: `src/hooks/useLastFm.ts`
**Changes**: Complete rewrite to use Effect

```typescript
import { useState, useCallback } from 'react';
import { Effect } from 'effect';
import type { Artist, GraphData } from '@/types/artist';
import { useEffectRuntime } from './useEffectRuntime';
import { LastFmService, GraphService } from '@/services';

export function useLastFm() {
  const { runEffect } = useEffectRuntime();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchArtists = useCallback(
    async (query: string): Promise<Artist[]> => {
      if (!query.trim()) return [];

      setIsLoading(true);
      setError(null);

      try {
        const result = await runEffect(
          Effect.gen(function* () {
            const lastFm = yield* LastFmService;
            return yield* lastFm.searchArtists(query);
          })
        );
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Search failed';
        setError(message);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [runEffect]
  );

  const getGraph = useCallback(
    async (artistName: string, depth: number = 1): Promise<GraphData | null> => {
      if (!artistName.trim()) return null;

      setIsLoading(true);
      setError(null);

      try {
        const result = await runEffect(
          Effect.gen(function* () {
            const graph = yield* GraphService;
            return yield* graph.buildGraph(artistName, Math.min(depth, 3));
          })
        );
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch graph';
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [runEffect]
  );

  const getArtist = useCallback(
    async (name: string): Promise<Artist | null> => {
      if (!name.trim()) return null;

      setIsLoading(true);
      setError(null);

      try {
        const result = await runEffect(
          Effect.gen(function* () {
            const lastFm = yield* LastFmService;
            return yield* lastFm.getArtistInfo(name);
          })
        );
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch artist';
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [runEffect]
  );

  return {
    searchArtists,
    getGraph,
    getArtist,
    isLoading,
    error,
  };
}
```

#### 2. Update useLastFm tests

**File**: `src/hooks/useLastFm.test.ts`
**Changes**: Update tests to mock Effect services instead of fetch

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useLastFm } from './useLastFm';

// Mock the Effect runtime hook
vi.mock('./useEffectRuntime', () => ({
  useEffectRuntime: () => ({
    runEffect: vi.fn().mockImplementation(async (effect) => {
      // Mock implementation will be set per test
      return mockRunEffect(effect);
    }),
  }),
}));

let mockRunEffect: (effect: unknown) => Promise<unknown>;

describe('useLastFm', () => {
  beforeEach(() => {
    mockRunEffect = vi.fn();
  });

  it('initializes with default state', () => {
    mockRunEffect = vi.fn();
    const { result } = renderHook(() => useLastFm());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('searches artists successfully', async () => {
    const mockArtists = [
      { name: 'Radiohead', listeners: 1000000 },
      { name: 'Radiohead Tribute', listeners: 50000 },
    ];

    mockRunEffect = vi.fn().mockResolvedValue(mockArtists);

    const { result } = renderHook(() => useLastFm());

    let artists: unknown[];
    await act(async () => {
      artists = await result.current.searchArtists('Radiohead');
    });

    expect(artists!).toEqual(mockArtists);
  });

  it('returns empty array for empty query', async () => {
    const { result } = renderHook(() => useLastFm());

    let artists: unknown[];
    await act(async () => {
      artists = await result.current.searchArtists('');
    });

    expect(artists!).toEqual([]);
  });

  it('handles search errors', async () => {
    mockRunEffect = vi.fn().mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useLastFm());

    await act(async () => {
      await result.current.searchArtists('test');
    });

    expect(result.current.error).toBe('API Error');
  });
});
```

### Success Criteria:

#### Automated Verification:
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds
- [ ] `npm run test` passes

#### Manual Verification:
- [ ] Search for artist returns results
- [ ] Clicking artist loads graph
- [ ] Graph displays nodes and edges
- [ ] Error messages appear on failures

**Implementation Note**: After completing this phase and all automated verification passes, pause here for THOROUGH manual testing before proceeding to deletion.

---

## Phase 5: Delete Workers API

### Overview
Remove the now-unused Workers API code.

### Changes Required:

#### 1. Delete workers directory

**Files to delete**:
- `workers/api/index.ts`
- `workers/api/index.test.ts`
- `workers/api/wrangler.toml`
- `workers/` directory

#### 2. Remove worker scripts from package.json

**File**: `package.json`
**Changes**: Remove worker-related scripts

```json
// Remove these lines:
"dev:worker": "wrangler dev workers/api/index.ts --local",
"deploy:worker": "wrangler deploy workers/api/index.ts"
```

#### 3. Remove wrangler dependency (if present)

Check if `wrangler` or `@cloudflare/vite-plugin` are still needed. If not, remove from devDependencies.

#### 4. Update .env.example

**File**: `.env.example`
**Changes**: Remove VITE_API_BASE as it's no longer needed

```bash
# Remove this line if present:
VITE_API_BASE=/api
```

### Success Criteria:

#### Automated Verification:
- [ ] `npm run build` succeeds
- [ ] `npm run test` passes
- [ ] `npm run lint` passes
- [ ] No references to `workers/` in codebase

#### Manual Verification:
- [ ] Full app smoke test:
  - [ ] Home page loads
  - [ ] Search returns results
  - [ ] Graph loads and displays
  - [ ] Node clicking works
  - [ ] Zoom controls work
  - [ ] Threshold slider works
  - [ ] Navigation works

---

## Testing Strategy

### Unit Tests
- Effect services should be tested with `@effect/vitest`
- Mock SurrealDB and fetch for isolation
- Test error handling paths

### Integration Tests
- Test full graph building with mocked external APIs
- Verify BFS traversal produces correct graph structure

### Manual Testing
- Essential before deleting Workers API
- Test all user flows end-to-end

---

## Performance Considerations

### Current Workers API Advantages
- Runs on Cloudflare edge (low latency)
- Has parallel processing with concurrency limit
- Per-request caching

### Effect Migration Considerations
- Browser-based calls may have higher latency
- Effect.all can parallelize but needs configuration
- Consider adding request caching in GraphService

### Mitigation
- Keep the same caching strategy in GraphService
- Consider adding Effect.all with concurrency for similar artist fetching
- Monitor performance after migration

---

## Rollback Strategy

If Effect integration fails:
1. Keep Workers API running as fallback
2. Revert useLastFm.ts to previous version
3. Re-enable VITE_API_BASE environment variable

---

## References

- Effect documentation: https://effect.website
- Current Effect services: `src/services/*.ts`
- Workers API to port: `workers/api/index.ts:244-383` (BFS algorithm)
- Research document: `thoughts/shared/research/2025-12-19-codebase-improvement-opportunities.md`
