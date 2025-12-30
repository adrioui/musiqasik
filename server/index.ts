import { HttpApiBuilder } from "@effect/platform";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { MusiqasiQApi } from "./api";
import { ServerConfigLive } from "./config";
import { ApiHandlersLive } from "./handlers";
import { LastFmAuthServiceLive } from "./services/lastfm-auth";

// Build the API layer with all handlers
const ApiLive = HttpApiBuilder.api(MusiqasiQApi).pipe(
  Layer.provide(ApiHandlersLive),
);

// Compose all service layers
const ServicesLive = Layer.mergeAll(
  ServerConfigLive,
  LastFmAuthServiceLive.pipe(Layer.provide(ServerConfigLive)),
);

// Get port from environment
const port = parseInt(process.env.PORT || "3001", 10);

// Create the server layer with CORS
const ServerLive = HttpApiBuilder.serve().pipe(
  Layer.provide(HttpApiBuilder.middlewareCors({ allowedOrigins: ["*"] })),
  Layer.provide(ApiLive),
  Layer.provide(ServicesLive),
  Layer.provide(BunHttpServer.layer({ port })),
);

// Run the server
const main = Effect.gen(function* () {
  yield* Effect.logInfo("🚀 Server starting...");
  yield* Effect.logInfo(`   Listening on port ${port}`);
  yield* Effect.logInfo("   POST /api/lastfm/session - Exchange OAuth token");
  yield* Effect.logInfo("   GET  /api/health         - Health check");
  yield* Layer.launch(ServerLive);
});

BunRuntime.runMain(main);
