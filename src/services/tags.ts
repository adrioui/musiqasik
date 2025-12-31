import { Context, type Effect } from 'effect'
import type { AppError } from '@/lib/errors'
import type { Artist, GraphData } from '@/types/artist'

// Service Tags - these are just type definitions without implementations

export class LastFmService extends Context.Tag('LastFmService')<
  LastFmService,
  {
    searchArtists: (query: string) => Effect.Effect<Artist[], AppError>
    getArtistInfo: (artistName: string) => Effect.Effect<Artist | null, AppError>
    getSimilarArtists: (
      artistName: string,
    ) => Effect.Effect<Array<{ name: string; match: number }>, AppError>
  }
>() {}

export class ConfigService extends Context.Tag('ConfigService')<
  ConfigService,
  {
    lastFmApiKey: string
  }
>() {}

export class GraphService extends Context.Tag('GraphService')<
  GraphService,
  {
    buildGraph: (artistName: string, maxDepth: number) => Effect.Effect<GraphData, AppError>
  }
>() {}
