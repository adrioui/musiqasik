import { createHash } from 'node:crypto'
import { Context, Data, Effect, Layer } from 'effect'
import { WorkerConfig } from '../config'

// Error type
export class LastFmAuthError extends Data.TaggedError('musiqasik/LastFmAuthError')<{
  readonly message: string
  readonly code?: number
}> {}

// Service interface
export class LastFmAuthService extends Context.Tag('musiqasik/LastFmAuthService')<
  LastFmAuthService,
  {
    readonly getSession: (
      token: string,
    ) => Effect.Effect<{ sessionKey: string; username: string }, LastFmAuthError>
  }
>() {}

const LASTFM_API_URL = 'https://ws.audioscrobbler.com/2.0/'

// MD5 using nodejs_compat
const md5 = (message: string): string => createHash('md5').update(message).digest('hex')

// Service implementation
const makeLastFmAuthService = Effect.gen(function* () {
  const config = yield* WorkerConfig

  const getSession = (
    token: string,
  ): Effect.Effect<{ sessionKey: string; username: string }, LastFmAuthError> =>
    Effect.gen(function* () {
      const params: Record<string, string> = {
        method: 'auth.getSession',
        api_key: config.lastFmApiKey,
        token: token,
      }

      // Generate MD5 signature (sorted params + shared secret)
      const sortedKeys = Object.keys(params).sort()
      let signatureString = ''
      for (const key of sortedKeys) {
        signatureString += `${key}${params[key]}`
      }
      signatureString += config.lastFmSharedSecret

      const apiSig = md5(signatureString)

      // Build URL
      const url = new URL(LASTFM_API_URL)
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.append(key, value)
      }
      url.searchParams.append('api_sig', apiSig)
      url.searchParams.append('format', 'json')

      // Fetch from Last.fm
      const response = yield* Effect.tryPromise({
        try: () => fetch(url.toString()),
        catch: (error) => {
          // Log the full error for debugging but don't expose it to the client
          console.error('Last.fm network error:', error)
          return new LastFmAuthError({
            message: 'Network error connecting to Last.fm',
          })
        },
      })

      if (!response.ok) {
        return yield* Effect.fail(
          new LastFmAuthError({
            message: 'Last.fm API request failed',
            code: response.status,
          }),
        )
      }

      const data = yield* Effect.tryPromise({
        try: () =>
          response.json() as Promise<{
            session?: { key: string; name: string }
            error?: number
            message?: string
          }>,
        catch: () => new LastFmAuthError({ message: 'Failed to parse response' }),
      })

      if (data.error || !data.session) {
        return yield* Effect.fail(
          new LastFmAuthError({
            message: data.message || 'Authentication failed',
            code: data.error,
          }),
        )
      }

      return {
        sessionKey: data.session.key,
        username: data.session.name,
      }
    })

  return { getSession }
})

export const LastFmAuthServiceLive = Layer.effect(LastFmAuthService, makeLastFmAuthService)
