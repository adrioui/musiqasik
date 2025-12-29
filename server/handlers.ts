import { HttpApiBuilder } from '@effect/platform';
import { Effect } from 'effect';
import { MusiqasiQApi } from './api';
import { LastFmAuthService, LastFmAuthError } from './services/lastfm-auth';

// Implement the API group handlers
export const ApiHandlersLive = HttpApiBuilder.group(MusiqasiQApi, 'api', (handlers) =>
  handlers
    // Health check handler
    .handle('health', () =>
      Effect.succeed({
        status: 'ok' as const,
        timestamp: new Date().toISOString(),
      })
    )
    // Session exchange handler
    .handle('session', ({ payload }) =>
      Effect.gen(function* () {
        const authService = yield* LastFmAuthService;
        return yield* authService.getSession(payload.token);
      }).pipe(
        Effect.catchTag('musiqasik/LastFmAuthError', (error: LastFmAuthError) =>
          Effect.fail({
            error: error.message,
          })
        )
      )
    )
);
