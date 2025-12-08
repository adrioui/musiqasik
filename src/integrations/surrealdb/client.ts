import { Surreal } from "surrealdb";
import { Context, Effect, Layer } from "effect";
import { DatabaseError } from "@/lib/errors";

const isServerless = typeof process !== "undefined" && (process.env.VERCEL || process.env.NETLIFY);

const SURREALDB_WS_URL = import.meta.env.VITE_SURREALDB_WS_URL || (typeof process !== "undefined" ? process.env.SURREALDB_WS_URL : undefined);
const SURREALDB_HTTP_URL = import.meta.env.VITE_SURREALDB_HTTP_URL || (typeof process !== "undefined" ? process.env.SURREALDB_HTTP_URL : undefined);
const SURREALDB_NAMESPACE = import.meta.env.VITE_SURREALDB_NAMESPACE || (typeof process !== "undefined" ? process.env.SURREALDB_NAMESPACE : undefined) || "musiqasik";
const SURREALDB_DATABASE = import.meta.env.VITE_SURREALDB_DATABASE || (typeof process !== "undefined" ? process.env.SURREALDB_DATABASE : undefined) || "main";
const SURREALDB_USER = import.meta.env.VITE_SURREALDB_USER || (typeof process !== "undefined" ? process.env.SURREALDB_USER : undefined);
const SURREALDB_PASS = import.meta.env.VITE_SURREALDB_PASS || (typeof process !== "undefined" ? process.env.SURREALDB_PASS : undefined);

export class SurrealClient extends Context.Tag("SurrealClient")<
  SurrealClient,
  Surreal
>() {}

// Global singleton for serverless environments to prevent connection exhaustion
let globalSurreal: Surreal | null = null;

const connectSurreal = Effect.acquireRelease(
  Effect.gen(function* () {
    // In serverless, reuse global connection
    if (isServerless && globalSurreal) {
      return globalSurreal;
    }
    
    const db = new Surreal();
    
    // Always use HTTP in serverless, WebSocket in Node servers
    const url = isServerless ? SURREALDB_HTTP_URL : SURREALDB_WS_URL;
    
    if (!url) {
      return yield* Effect.fail(
        new DatabaseError({ message: "SurrealDB URL not configured" })
      );
    }
    
    yield* Effect.tryPromise({
      try: () => db.connect(url, {
        namespace: SURREALDB_NAMESPACE,
        database: SURREALDB_DATABASE,
        auth: {
          username: SURREALDB_USER || "root",
          password: SURREALDB_PASS || "root",
        },
      }),
      catch: (error) => new DatabaseError({ message: "Failed to connect to SurrealDB", cause: error }),
    });
    
    yield* Effect.tryPromise({
      try: () => db.ready,
      catch: (error) => new DatabaseError({ message: "SurrealDB not ready", cause: error }),
    });
    
    if (isServerless) {
      globalSurreal = db;
    }
    
    console.log("SurrealDB connected successfully");
    return db;
  }),
  // Don't close connection in serverless to reuse across requests
  (db) => isServerless ? Effect.void : Effect.promise(() => db.close())
);

export const SurrealLive = Layer.scoped(SurrealClient, connectSurreal);
