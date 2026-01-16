## 2025-05-22 - [Secure Error Handling in Cloudflare Workers]
**Vulnerability:** API endpoints were returning raw error messages to the client in the `catch` block (`error.message`).
**Learning:** This can leak internal implementation details (e.g., database connection errors, upstream API failure details) to the client, which aids attackers in reconnaissance.
**Prevention:** Always log the full error server-side (e.g., `console.error`) and return a generic "Internal Server Error" message to the client for unexpected exceptions. Only return specific error messages for known, safe domain errors (like Authentication Failed).
