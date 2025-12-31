import { Effect, Layer, pipe, Schedule, Schema } from 'effect'
import { LastFmApiError, NetworkError, ValidationError } from '@/lib/errors'
import { isPlaceholderImage } from '@/lib/utils'
import {
  LastFmArtistInfoResponseSchema,
  LastFmArtistSearchResponseSchema,
  LastFmSimilarArtistsResponseSchema,
} from '@/schemas/lastfm'
import type { Artist } from '@/types/artist'
import { ConfigService, LastFmService } from './tags'

const fetchWithTimeout = (url: string, options: RequestInit = {}, timeoutMs = 5000) =>
  Effect.async<Response, NetworkError>((resume) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    fetch(url, { ...options, signal: controller.signal })
      .then((response) => {
        clearTimeout(timeoutId)
        resume(Effect.succeed(response))
      })
      .catch((error) => {
        clearTimeout(timeoutId)
        resume(Effect.fail(new NetworkError({ message: error.message, cause: error })))
      })
  })

const fetchWithRetry = (url: string, options: RequestInit = {}, maxRetries = 2) =>
  pipe(
    fetchWithTimeout(url, options),
    Effect.tap((response) =>
      Effect.sync(() => {
        // Respect Retry-After header if present
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After')
          if (retryAfter) {
            const delayMs = parseInt(retryAfter, 10) * 1000
            console.warn(`Rate limited. Retrying after ${delayMs}ms`)
          }
        }
      }),
    ),
    Effect.retry(Schedule.exponential(100).pipe(Schedule.compose(Schedule.recurs(maxRetries)))),
  )

const fetchDeezerImage = (artistName: string): Effect.Effect<string | undefined, NetworkError> =>
  pipe(
    fetchWithRetry(
      `https://api.deezer.com/search/artist?q=${encodeURIComponent(artistName)}&limit=1`,
    ),
    Effect.flatMap((response) =>
      Effect.tryPromise({
        try: () => response.json() as Promise<{ data?: Array<{ picture_xl?: string }> }>,
        catch: (error) =>
          new NetworkError({
            message: 'Failed to parse Deezer response',
            cause: error,
          }),
      }),
    ),
    Effect.map((data) => data.data?.[0]?.picture_xl),
    Effect.catchAll(() => Effect.succeed(undefined)),
  )

// Helper to validate API responses with Effect Schema
const validateResponse =
  <A, I>(schema: Schema.Schema<A, I, never>) =>
  (data: unknown): Effect.Effect<A, ValidationError> =>
    Schema.decodeUnknown(schema)(data).pipe(
      Effect.mapError(
        (parseError) =>
          new ValidationError({
            message: 'Invalid Last.fm API response',
            errors: parseError,
          }),
      ),
    )

const makeLastFmService = Effect.gen(function* () {
  const config = yield* ConfigService

  return LastFmService.of({
    searchArtists: (query: string) =>
      Effect.gen(function* () {
        const response = yield* fetchWithRetry(
          `https://ws.audioscrobbler.com/2.0/?method=artist.search&artist=${encodeURIComponent(query)}&api_key=${config.lastFmApiKey}&format=json&limit=10`,
        )

        if (!response.ok) {
          return yield* Effect.fail(
            new LastFmApiError({
              message: `Last.fm API error: ${response.status}`,
              status: response.status,
            }),
          )
        }

        const json = yield* Effect.tryPromise({
          try: () => response.json(),
          catch: (error) =>
            new LastFmApiError({
              message: 'Failed to parse Last.fm response',
              cause: error,
            }),
        })

        // Validate with Effect Schema
        const data = yield* validateResponse(LastFmArtistSearchResponseSchema)(json)

        const artists = data.results?.artistmatches?.artist || []

        return artists.map((artist) => {
          const lastfmImage = artist.image?.find((img) => img.size === 'large')?.['#text']
          return {
            name: artist.name,
            lastfm_mbid: artist.mbid || undefined,
            image_url: isPlaceholderImage(lastfmImage) ? undefined : lastfmImage,
            listeners: artist.listeners ? parseInt(artist.listeners, 10) : undefined,
            lastfm_url: artist.url || undefined,
          } as Artist
        })
      }),

    getArtistInfo: (artistName: string) =>
      Effect.gen(function* () {
        const response = yield* fetchWithRetry(
          `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(artistName)}&api_key=${config.lastFmApiKey}&format=json`,
        )

        if (!response.ok) {
          return yield* Effect.fail(
            new LastFmApiError({
              message: `Last.fm API error: ${response.status}`,
              status: response.status,
            }),
          )
        }

        const json = yield* Effect.tryPromise({
          try: () => response.json(),
          catch: (error) =>
            new LastFmApiError({
              message: 'Failed to parse Last.fm response',
              cause: error,
            }),
        })

        // Validate with Effect Schema
        const data = yield* validateResponse(LastFmArtistInfoResponseSchema)(json)

        if (data.error || !data.artist) {
          return null
        }

        const artist = data.artist
        const lastfmImage = artist.image?.find((img) => img.size === 'extralarge')?.['#text']

        let imageUrl: string | undefined
        if (isPlaceholderImage(lastfmImage)) {
          imageUrl = yield* fetchDeezerImage(artist.name)
        } else {
          imageUrl = lastfmImage
        }

        return {
          name: artist.name,
          lastfm_mbid: artist.mbid || undefined,
          image_url: imageUrl,
          listeners: artist.stats?.listeners ? parseInt(artist.stats.listeners, 10) : undefined,
          playcount: artist.stats?.playcount ? parseInt(artist.stats.playcount, 10) : undefined,
          tags: artist.tags?.tag?.map((t) => t.name) || [],
          lastfm_url: artist.url || undefined,
        } as Artist
      }),

    getSimilarArtists: (artistName: string) =>
      Effect.gen(function* () {
        const response = yield* fetchWithRetry(
          `https://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&artist=${encodeURIComponent(artistName)}&api_key=${config.lastFmApiKey}&format=json&limit=15`,
        )

        if (!response.ok) {
          return yield* Effect.fail(
            new LastFmApiError({
              message: `Last.fm API error: ${response.status}`,
              status: response.status,
            }),
          )
        }

        const json = yield* Effect.tryPromise({
          try: () => response.json(),
          catch: (error) =>
            new LastFmApiError({
              message: 'Failed to parse Last.fm response',
              cause: error,
            }),
        })

        // Validate with Effect Schema
        const data = yield* validateResponse(LastFmSimilarArtistsResponseSchema)(json)

        const similar = data.similarartists?.artist || []
        return similar.map((artist) => ({
          name: artist.name,
          match: parseFloat(artist.match),
        }))
      }),
  })
})

export const LastFmServiceLive = Layer.effect(LastFmService, makeLastFmService)
