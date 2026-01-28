## 2026-01-28 - Secure Error Handling with Effect in Workers
**Vulnerability:** `Effect.runPromise` throws `FiberFailure` wrapping the original error, causing `instanceof` checks to fail in `try/catch` blocks. This leads to expected errors falling through to generic error handlers, potentially leaking internal error details or logging "unknown error" for valid business logic failures.
**Learning:** In Cloudflare Workers using Effect, standard `try/catch` around `runPromise` is insufficient for precise error handling.
**Prevention:** Use `Effect.runPromiseExit` and pattern match on the `Exit` type. Check `Cause.isFailType(exit.cause)` to distinguish expected failures (domain errors) from defects (crashes).
