## 2024-05-23 - ForceGraph Tooltip XSS
**Vulnerability:** A Stored XSS vulnerability was identified in `src/components/ForceGraph/index.tsx` where D3's `.html()` method was used to render tooltip content using unescaped data from the artist object (`name`, `tags`).
**Learning:** Using `selection.html()` in D3 with dynamic data is just as dangerous as `innerHTML` in vanilla JS or `dangerouslySetInnerHTML` in React. Data from external APIs (Last.fm) should not be trusted implicitly.
**Prevention:** Always use safe DOM manipulation methods in D3: `selection.append('tag').text(value)` or `selection.insert('tag').text(value)`. This ensures that content is treated as text nodes, automatically escaping any HTML entities.
