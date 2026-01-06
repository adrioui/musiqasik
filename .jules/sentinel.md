## 2026-01-06 - D3.js Tooltip XSS
**Vulnerability:** Usage of `.html()` in D3 tooltips allowed injection of arbitrary HTML/scripts via artist names.
**Learning:** Data from external APIs (Last.fm) should never be trusted in DOM injection, even if it looks like plain text. D3's `.html()` is a common pitfall.
**Prevention:** Use `.text()` and `.append()` to construct DOM elements safely, or use a sanitizer if HTML is absolutely necessary.
