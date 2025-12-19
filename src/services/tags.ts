import { Context, Effect } from 'effect';
import type { AppError } from '@/lib/errors';
import type { Artist, GraphData } from '@/types/artist';

// Service Tags - these are just type definitions without implementations
// Used to break circular dependencies

export class LastFmService extends Context.Tag('LastFmService')<
  LastFmService,
  {
    searchArtists: (query: string) => Effect.Effect<Artist[], AppError>;
    getArtistInfo: (artistName: string) => Effect.Effect<Artist | null, AppError>;
    getSimilarArtists: (
      artistName: string
    ) => Effect.Effect<Array<{ name: string; match: number }>, AppError>;
  }
>() {}

export class DatabaseService extends Context.Tag('DatabaseService')<
  DatabaseService,
  {
    getArtist: (artistName: string) => Effect.Effect<Artist | null, AppError>;
    upsertArtist: (artist: Omit<Artist, 'id'>) => Effect.Effect<Artist, AppError>;
    getCachedEdges: (
      artistId: string
    ) => Effect.Effect<Array<{ target: Artist; match_score: number }>, AppError>;
    upsertEdges: (
      edges: Array<{
        source_artist_id: string;
        target_artist_id: string;
        match_score: number;
        depth: number;
      }>
    ) => Effect.Effect<void, AppError>;
    getSimilarityGraph: (
      artistName: string,
      maxDepth: number
    ) => Effect.Effect<GraphData, AppError>;
  }
>() {}

export class ConfigService extends Context.Tag('ConfigService')<
  ConfigService,
  {
    lastFmApiKey: string;
    surrealdbWsUrl: string;
    surrealdbHttpUrl: string;
    surrealdbNamespace: string;
    surrealdbDatabase: string;
    surrealdbUser: string;
    surrealdbPass: string;
  }
>() {}

export class GraphService extends Context.Tag('GraphService')<
  GraphService,
  {
    buildGraph: (
      artistName: string,
      maxDepth: number
    ) => Effect.Effect<GraphData & { metrics?: { duration: number; nodeCount: number } }, AppError>;
  }
>() {}
