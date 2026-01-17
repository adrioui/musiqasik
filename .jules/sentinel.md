# Sentinel's Journal

This journal records CRITICAL security learnings, vulnerabilities, and patterns found in the codebase.
Entries follow the format:
## YYYY-MM-DD - [Title]
**Vulnerability:** [What you found]
**Learning:** [Why it existed]
**Prevention:** [How to avoid next time]

---

## 2025-02-17 - Secure Error Handling in Cloudflare Workers with Effect
**Vulnerability:** API errors were risking information leakage because `Effect.runPromise` throws `FiberFailure` for both expected errors and unexpected defects, making it difficult to distinguish between them and return appropriate, sanitized responses to the client.
**Learning:** `Effect.runPromise` wraps all failures in `FiberFailure` (or throws them), which breaks `instanceof` checks for expected domain errors if not handled carefully. This can lead to fallback error handlers logging internal details or crashing completely.
**Prevention:** Use `Effect.runPromiseExit` to get an `Exit` type. Pattern match on `Exit.isSuccess` and use `Cause.failureOption(exit.cause)` to securely extract and handle expected domain errors, while generic logging and error masking for unexpected defects (Causes).
