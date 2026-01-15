# Sentinel's Journal

## 2025-02-18 - D3.js XSS Vulnerability
**Vulnerability:** Found `d3.selection.html()` usage with unsanitized API data in `src/components/ForceGraph/index.tsx`.
**Learning:** D3.js's `.html()` method sets `innerHTML` directly and does not sanitize input, unlike `.text()` or React's rendering. Even if data comes from a "trusted" API (Last.fm), it should be treated as untrusted.
**Prevention:** Avoid `.html()` in D3 code. Use `.text()` for text content or construct DOM elements programmatically with `.append()`.
