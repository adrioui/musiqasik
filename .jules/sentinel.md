# Sentinel's Journal

## 2025-02-19 - TypeScript Generics False Security
**Vulnerability:** Runtime type mismatch in API handlers.
**Learning:** `c.req.json<T>()` in Hono (and similar frameworks) provides compile-time type safety but NO runtime validation. Developers may assume `body.token` is a string because of the generic, but it can be any JSON type, leading to logic errors or bypasses.
**Prevention:** Always pair TS generics with runtime validation libraries (like Zod or Effect Schema) or explicit type checks (`typeof`) at the API boundary.
