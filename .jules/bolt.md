## 2026-01-16 - Unoptimized Resize Listeners
**Learning:** The `useElementDimensions` hook was attaching a raw `resize` listener without debouncing, causing excessive re-renders of the heavy `ForceGraph` component during window resizing.
**Action:** Always wrap `resize` and `scroll` listeners in a `debounce` or `throttle` utility, especially when they trigger state updates that affect complex rendering like D3 graphs.
