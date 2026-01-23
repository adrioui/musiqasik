## 2025-05-15 - Secure Worker API Error Handling

**Vulnerability:** The Worker API was returning `error.message` for all caught errors in the `/api/lastfm/session` endpoint. This could leak internal implementation details (stack traces, database connection strings, etc.) to the client if an unexpected error occurred. Additionally, the token input was not strictly validated.

**Learning:** When using `Effect.runPromise` in Cloudflare Workers, failures are thrown as `FiberFailure` objects (in some contexts) or simple errors. Relying on a catch-all block that returns `error.message` is insecure. Input validation at the API boundary is crucial to prevent invalid data from reaching internal logic.

**Prevention:**
1. **Strict Input Validation:** Validate all input fields (types, lengths, formats) immediately upon request receipt.
2. **Generic Error Messages:** For unexpected errors (500s), log the full error server-side (e.g., `console.error`) but return a generic "Internal Server Error" message to the client.
3. **Effect Error Handling:** Be aware that `Effect.runPromise` might throw wrapper errors. Use `Effect.runPromiseExit` for precise control or ensure the catch block handles `FiberFailure` if needing to extract specific domain errors.
