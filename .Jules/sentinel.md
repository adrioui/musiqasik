## 2024-05-23 - Secure Error Handling in Cloudflare Workers with Effect
**Vulnerability:** Uncaught `FiberFailure` exceptions in Cloudflare Workers can leak internal stack traces or cause 500 errors without proper logging when using `Effect.runPromise` and standard `try/catch` blocks.
**Learning:** `Effect.runPromise` throws a `FiberFailure` which wraps the original error, breaking `instanceof` checks and standard error handling logic.
**Prevention:** Always use `Effect.runPromiseExit` in the Worker entry point. Pattern match on `Exit.Success` and `Exit.Failure`. For failures, distinguish between expected domain errors (`Cause.isFailType`) and unexpected defects, ensuring generic responses for the latter.
