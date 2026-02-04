## 2025-05-22 - Missing Input Validation in Hono/Worker

**Vulnerability:** The Cloudflare Worker API endpoint `/api/lastfm/session` accepted a `token` parameter from the JSON body without any validation. While `c.req.json()` parses JSON, it does not validate the content. This allowed potentially malicious or malformed tokens to be passed to the Last.fm service or used in hashing operations.

**Learning:** TypeScript interfaces in `c.req.json<T>()` only provide compile-time type checking. They do not perform any runtime validation. Developers often assume that because it is typed, it is safe, but `any` JSON matches `any` interface at runtime if not checked.

**Prevention:** Always implement explicit runtime validation for external inputs. Use regex for simple strings (like API keys/tokens) or schema validation libraries (like Zod, Effect Schema, or Valibot) for complex objects. Never trust client input.
