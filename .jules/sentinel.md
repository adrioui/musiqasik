# Sentinel's Journal

## 2025-02-14 - Secure Error Handling in Workers
**Vulnerability:** Worker API leaked internal error details (including stack traces or implementation details) to the client in the event of unexpected defects, while domain errors were handled but wrapped in `FiberFailure` if not properly exited.
**Learning:** Using `Effect.runPromise` without `Effect.runPromiseExit` or a `catch` that unwraps `FiberFailure` causes unexpected crashes to return verbose error objects or fail to distinguish between domain logic failures and system defects.
**Prevention:** Use `Effect.runPromiseExit(program)` and pattern match on the `Exit` type. Handle `Exit.isSuccess` for happy path. For failures, check `Cause.isFailType(exit.cause)` to handle expected domain errors (like 401 Auth). For all other causes (Die, Interrupt), log `Cause.pretty(exit.cause)` server-side and return a generic "Internal Server Error" (500) to the client.
