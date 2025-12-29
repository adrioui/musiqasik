import { Context, Effect, Layer, Data } from 'effect';
import * as crypto from 'crypto';
import { ServerConfig } from '../config';

// Error types with unique tag identifier
export class LastFmAuthError extends Data.TaggedError('musiqasik/LastFmAuthError')<{
  readonly message: string;
  readonly code?: number;
}> {}

// Service interface with unique tag identifier
export class LastFmAuthService extends Context.Tag('musiqasik/LastFmAuthService')<
  LastFmAuthService,
  {
    readonly getSession: (
      token: string
    ) => Effect.Effect<{ sessionKey: string; username: string }, LastFmAuthError>;
  }
>() {}

// Service implementation
const LASTFM_API_URL = 'https://ws.audioscrobbler.com/2.0/';

const makeLastFmAuthService = Effect.gen(function* () {
  const config = yield* ServerConfig;

  const getSession = (
    token: string
  ): Effect.Effect<{ sessionKey: string; username: string }, LastFmAuthError> =>
    Effect.gen(function* () {
      const params: Record<string, string> = {
        method: 'auth.getSession',
        api_key: config.lastFmApiKey,
        token: token,
      };

      // Generate MD5 signature (sorted params + shared secret)
      const sortedKeys = Object.keys(params).sort();
      let signatureString = '';
      for (const key of sortedKeys) {
        signatureString += `${key}${params[key]}`;
      }
      signatureString += config.lastFmSharedSecret;
      const apiSig = crypto.createHash('md5').update(signatureString, 'utf8').digest('hex');

      // Build URL
      const url = new URL(LASTFM_API_URL);
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.append(key, value);
      }
      url.searchParams.append('api_sig', apiSig);
      url.searchParams.append('format', 'json');

      // Fetch from Last.fm
      const response = yield* Effect.tryPromise({
        try: () => fetch(url.toString()),
        catch: (error) =>
          new LastFmAuthError({
            message: `Network error: ${error instanceof Error ? error.message : 'Unknown'}`,
          }),
      });

      if (!response.ok) {
        return yield* Effect.fail(
          new LastFmAuthError({ message: 'Last.fm API request failed', code: response.status })
        );
      }

      const data = yield* Effect.tryPromise({
        try: () =>
          response.json() as Promise<{
            session?: { key: string; name: string };
            error?: number;
            message?: string;
          }>,
        catch: () => new LastFmAuthError({ message: 'Failed to parse response' }),
      });

      if (data.error || !data.session) {
        return yield* Effect.fail(
          new LastFmAuthError({
            message: data.message || 'Authentication failed',
            code: data.error,
          })
        );
      }

      return {
        sessionKey: data.session.key,
        username: data.session.name,
      };
    });

  return { getSession };
});

export const LastFmAuthServiceLive = Layer.effect(LastFmAuthService, makeLastFmAuthService);
