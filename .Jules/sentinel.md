## 2025-05-22 - Effect Error Handling in Workers
**Vulnerability:** Standard `try/catch` blocks around `Effect.runPromise` may receive `FiberFailure` objects instead of the thrown domain error, potentially bypassing `instanceof` checks for specific error handling.
**Learning:** `Effect.runPromise` failures can be wrapped in `FiberFailure` in some contexts or versions, breaking `error instanceof CustomError` logic.
**Prevention:** Use `Effect.runPromiseExit` to get an `Exit` type, then inspect `Exit.Failure` causes securely, or ensure errors are properly unwrapped before checking types.
