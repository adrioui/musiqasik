# Sentinel Journal

## 2024-05-22 - Missing Security Headers
**Vulnerability:** The Cloudflare Worker API is missing standard security headers (HSTS, X-Content-Type-Options, etc.), which increases the risk of XSS and clickjacking.
**Learning:** Even simple API backends need basic security headers to provide defense-in-depth, especially when dealing with authentication tokens.
**Prevention:** Use `hono/secure-headers` middleware by default in all Hono-based workers.
