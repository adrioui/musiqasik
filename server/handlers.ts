import { HttpApiBuilder } from "@effect/platform";
import { Effect } from "effect";
import { MusiqasiQApi, ServerError, UnauthorizedError } from "./api";
import {
  type LastFmAuthError,
  LastFmAuthService,
} from "./services/lastfm-auth";

// Implement the API group handlers
export const ApiHandlersLive = HttpApiBuilder.group(
  MusiqasiQApi,
  "api",
  (handlers) =>
    handlers
      // Health check handler
      .handle("health", () =>
        Effect.succeed({
          status: "ok" as const,
          timestamp: new Date().toISOString(),
        }),
      )
      // Session exchange handler
      .handle("session", ({ payload }) =>
        Effect.gen(function* () {
          const authService = yield* LastFmAuthService;
          return yield* authService.getSession(payload.token);
        }).pipe(
          Effect.mapError(
            (error: LastFmAuthError): UnauthorizedError | ServerError => {
              // Last.fm error code 4 = invalid token, 14 = unauthorized token
              // HTTP 401/403 also indicate auth failure
              const isAuthError =
                error.code === 4 ||
                error.code === 14 ||
                error.code === 401 ||
                error.code === 403;
              return isAuthError
                ? new UnauthorizedError({ error: error.message })
                : new ServerError({ error: error.message });
            },
          ),
        ),
      ),
);
