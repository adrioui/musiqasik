## 2025-02-18 - Secure Error Handling in Effect
**Vulnerability:** Leaking internal error details and stack traces to the client when using `Effect.runPromise` without proper exit handling.
**Learning:** `Effect.runPromise` throws on defects (unexpected errors), which can cause the worker to crash or return raw error messages if caught by a generic `catch (e)`.
**Prevention:** Use `Effect.runPromiseExit` and pattern match on the `Exit` type.
  - If `Exit.isSuccess(exit)`, return the value.
  - If `Exit.isFailure(exit)`, check the cause.
  - If the cause contains a known domain error (e.g., `LastFmAuthError`), return a specific 4xx response.
  - For all other causes (Defects), log the full error server-side (`console.error(Cause.pretty(cause))`) and return a generic 500 "Internal Server Error" to the client.
