## 2025-02-17 - Hono Request Validation Gaps
**Vulnerability:** The Hono `c.req.json<T>()` method allows specifying a generic type `T` but performs NO runtime validation that the body actually matches `T`. In `worker/index.ts`, this led to accepting any input as a token, potentially causing issues downstream.
**Learning:** TypeScript types at the I/O boundary are illusions. Hono prioritizes performance over validation.
**Prevention:** Always use explicit runtime checks (typeof, length, regex) or a schema validation library (like Zod) immediately after parsing JSON in Workers/Hono handlers.
