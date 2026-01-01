## 2024-05-23 - Security Headers & Error Handling
**Vulnerability:** Missing standard HTTP security headers (X-Frame-Options, X-Content-Type-Options) and potentially leaking internal error details in 500 responses.
**Learning:** Cloudflare Workers acting as both API and asset servers need security headers applied to all routes ('*') to protect the served frontend application (XSS, Clickjacking defense).
**Prevention:** Use `hono/secure-headers` middleware globally and ensure catch blocks return generic messages while logging specifics.