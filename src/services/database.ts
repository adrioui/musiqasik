import { Effect, Layer } from 'effect';
import { DatabaseError } from '@/lib/errors';
import { DatabaseService } from '@/services';
import { SurrealClient } from '@/integrations/surrealdb/client';
import type { Artist, GraphData } from '@/integrations/surrealdb/types';

const makeDatabaseService = Effect.gen(function* () {
  const db = yield* SurrealClient;

  return DatabaseService.of({
    getArtist: (artistName: string) =>
      Effect.gen(function* () {
        const result = yield* Effect.tryPromise({
          try: () =>
            db.query<[Artist[]]>(
              `SELECT * FROM artists WHERE name_lower = string::lowercase($name) LIMIT 1`,
              { name: artistName }
            ),
          catch: (error) => new DatabaseError({ message: 'Failed to query artist', cause: error }),
        });

        return result[0]?.[0] || null;
      }),

    upsertArtist: (artist: Omit<Artist, 'id'>) =>
      Effect.gen(function* () {
        const result = yield* Effect.tryPromise({
          try: () =>
            db.query<[Artist[]]>(
              `INSERT INTO artists {
               name: $name,
               name_lower: string::lowercase($name),
               lastfm_mbid: $mbid,
               image_url: $image_url,
               listeners: $listeners,
               playcount: $playcount,
               tags: $tags,
               lastfm_url: $lastfm_url
             } ON DUPLICATE KEY UPDATE
               lastfm_mbid = $mbid,
               image_url = $image_url,
               listeners = $listeners,
               playcount = $playcount,
               tags = $tags,
               lastfm_url = $lastfm_url,
               updated_at = time::now()`,
              {
                name: artist.name,
                mbid: artist.lastfm_mbid || null,
                image_url: artist.image_url || null,
                listeners: artist.listeners || null,
                playcount: artist.playcount || null,
                tags: artist.tags || [],
                lastfm_url: artist.lastfm_url || null,
              }
            ),
          catch: (error) => new DatabaseError({ message: 'Failed to upsert artist', cause: error }),
        });

        return result[0]?.[0] as Artist;
      }),

    getCachedEdges: (artistId: string) =>
      Effect.gen(function* () {
        const result = yield* Effect.tryPromise({
          try: () =>
            db.query<[Array<{ out: Artist; match_score: number }>]>(
              `SELECT out.*, match_score FROM similarity_edges WHERE in = $artistId`,
              { artistId }
            ),
          catch: (error) =>
            new DatabaseError({ message: 'Failed to fetch cached edges', cause: error }),
        });

        return (result[0] || []).map((edge) => ({
          target: edge.out,
          match_score: edge.match_score,
        }));
      }),

    upsertEdges: (edges) =>
      Effect.gen(function* () {
        if (edges.length === 0) return;

        // Build RELATE statements for each edge
        const relateStatements = edges
          .map(
            (edge, i) =>
              `RELATE $source${i}->similarity_edges->$target${i} SET match_score = $score${i}, depth = $depth${i};`
          )
          .join('\n');

        const params: Record<string, unknown> = {};
        edges.forEach((edge, i) => {
          params[`source${i}`] = edge.source_artist_id;
          params[`target${i}`] = edge.target_artist_id;
          params[`score${i}`] = edge.match_score;
          params[`depth${i}`] = edge.depth;
        });

        yield* Effect.tryPromise({
          try: () => db.query(relateStatements, params),
          catch: (error) => new DatabaseError({ message: 'Failed to upsert edges', cause: error }),
        });
      }),

    getSimilarityGraph: (artistName: string, maxDepth: number) =>
      Effect.gen(function* () {
        // First get the center artist
        const centerResult = yield* Effect.tryPromise({
          try: () =>
            db.query<[Artist[]]>(
              `SELECT * FROM artists WHERE name_lower = string::lowercase($name) LIMIT 1`,
              { name: artistName }
            ),
          catch: (error) =>
            new DatabaseError({ message: 'Failed to query center artist', cause: error }),
        });

        const center = centerResult[0]?.[0] || null;

        if (!center) {
          return { nodes: [], edges: [], center: null };
        }

        // Get all edges from this artist up to maxDepth using graph traversal
        const graphResult = yield* Effect.tryPromise({
          try: () =>
            db.query<[Array<{ in: Artist; out: Artist; match_score: number }>]>(
              `SELECT in.*, out.*, match_score 
             FROM similarity_edges 
             WHERE in = $centerId OR depth <= $maxDepth`,
              { centerId: center.id, maxDepth }
            ),
          catch: (error) =>
            new DatabaseError({ message: 'Failed to traverse graph', cause: error }),
        });

        const edgesData = graphResult[0] || [];

        // Collect unique nodes
        const nodesMap = new Map<string, Artist>();
        nodesMap.set(center.id!, center);

        edgesData.forEach((edge) => {
          if (edge.in?.id) nodesMap.set(edge.in.id, edge.in);
          if (edge.out?.id) nodesMap.set(edge.out.id, edge.out);
        });

        return {
          nodes: Array.from(nodesMap.values()),
          edges: edgesData.map((edge) => ({
            source: edge.in?.name || '',
            target: edge.out?.name || '',
            weight: edge.match_score,
          })),
          center,
        };
      }),
  });
});

export const DatabaseServiceLive = Layer.effect(DatabaseService, makeDatabaseService);
