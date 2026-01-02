## 2024-05-23 - XSS Vulnerability in D3 Tooltips
**Vulnerability:** The `ForceGraph` component used `.html()` to render user-controlled data (artist names and tags) into tooltips, creating a potential XSS vector.
**Learning:** D3's `.html()` method is unsafe for user content. It should only be used with trusted static HTML or after rigorous sanitization.
**Prevention:** Always use `.text()` for text content and `.append()` to construct DOM elements structurally. This ensures content is escaped by default.
