import { Schema } from 'effect'

// Image schema (common across responses)
export const LastFmImageSchema = Schema.Struct({
  '#text': Schema.String,
  size: Schema.String,
})

// Artist search result schema
export const LastFmArtistSearchResultSchema = Schema.Struct({
  name: Schema.String,
  mbid: Schema.optional(Schema.String),
  url: Schema.optional(Schema.String),
  listeners: Schema.optional(Schema.String),
  image: Schema.optional(Schema.Array(LastFmImageSchema)),
})

export const LastFmArtistSearchResponseSchema = Schema.Struct({
  results: Schema.optional(
    Schema.Struct({
      artistmatches: Schema.optional(
        Schema.Struct({
          artist: Schema.optional(Schema.Array(LastFmArtistSearchResultSchema)),
        }),
      ),
    }),
  ),
})

// Artist info schema
export const LastFmArtistInfoSchema = Schema.Struct({
  name: Schema.String,
  mbid: Schema.optional(Schema.String),
  url: Schema.optional(Schema.String),
  image: Schema.optional(Schema.Array(LastFmImageSchema)),
  stats: Schema.optional(
    Schema.Struct({
      listeners: Schema.optional(Schema.String),
      playcount: Schema.optional(Schema.String),
    }),
  ),
  bio: Schema.optional(
    Schema.Struct({
      summary: Schema.optional(Schema.String),
      content: Schema.optional(Schema.String),
    }),
  ),
  tags: Schema.optional(
    Schema.Struct({
      tag: Schema.optional(
        Schema.Array(
          Schema.Struct({
            name: Schema.String,
            url: Schema.optional(Schema.String),
          }),
        ),
      ),
    }),
  ),
})

export const LastFmArtistInfoResponseSchema = Schema.Struct({
  artist: Schema.optional(LastFmArtistInfoSchema),
  error: Schema.optional(Schema.Number),
  message: Schema.optional(Schema.String),
})

// Similar artists schema
export const LastFmSimilarArtistSchema = Schema.Struct({
  name: Schema.String,
  match: Schema.String,
  mbid: Schema.optional(Schema.String),
  url: Schema.optional(Schema.String),
  image: Schema.optional(Schema.Array(LastFmImageSchema)),
})

export const LastFmSimilarArtistsResponseSchema = Schema.Struct({
  similarartists: Schema.optional(
    Schema.Struct({
      artist: Schema.optional(Schema.Array(LastFmSimilarArtistSchema)),
    }),
  ),
  error: Schema.optional(Schema.Number),
  message: Schema.optional(Schema.String),
})

// Type exports
export type LastFmImage = Schema.Schema.Type<typeof LastFmImageSchema>
export type LastFmArtistSearchResult = Schema.Schema.Type<typeof LastFmArtistSearchResultSchema>
export type LastFmArtistSearchResponse = Schema.Schema.Type<typeof LastFmArtistSearchResponseSchema>
export type LastFmArtistInfo = Schema.Schema.Type<typeof LastFmArtistInfoSchema>
export type LastFmArtistInfoResponse = Schema.Schema.Type<typeof LastFmArtistInfoResponseSchema>
export type LastFmSimilarArtist = Schema.Schema.Type<typeof LastFmSimilarArtistSchema>
export type LastFmSimilarArtistsResponse = Schema.Schema.Type<
  typeof LastFmSimilarArtistsResponseSchema
>
