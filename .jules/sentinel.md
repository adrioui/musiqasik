## 2024-05-22 - API Input Validation & Error Handling
**Vulnerability:** The `/api/lastfm/session` endpoint in the Cloudflare Worker lacked proper input validation for the `token` field (allowing non-string types or excessive lengths) and exposed internal error details in 500 responses.
**Learning:** Even simple API endpoints need strict type and length boundaries. Generic error messages prevent leaking internal stack traces or upstream API details.
**Prevention:** Always validate request body fields for type and length. Use a global error handler that logs full details server-side but returns sanitized messages to the client.
