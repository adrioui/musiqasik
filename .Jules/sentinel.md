# Sentinel's Journal

## 2025-02-12 - Worker Input Validation & Error Handling
**Vulnerability:** The Worker API accepted any string as a token without validation and exposed raw error messages to the client in 500 responses.
**Learning:** Even internal APIs or proxy services need strict input validation to prevent malformed data from reaching upstream services or causing unexpected behavior. Exposing raw error messages can leak implementation details.
**Prevention:** Always validate inputs against expected formats (regex for tokens) and use a generic error message for 500 responses while logging the actual error server-side.
