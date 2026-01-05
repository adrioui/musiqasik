## 2024-05-23 - Safe Error Handling in Effects
**Vulnerability:** Generic error messages (`error.message`) were leaked in API responses, potentially exposing internal stack traces or path information.
**Learning:** Even with structured error handling (like `Effect`), catch-all handlers often default to returning raw error details. Defensive programming requires explicit sanitization at the boundary.
**Prevention:** Always implement a top-level error handler that logs the full error server-side (for debugging) but returns a generic "Internal Server Error" message to the client.
