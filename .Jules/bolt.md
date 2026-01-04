## 2024-05-23 - [Debounce Resize Handlers]
**Learning:** Attaching `resize` event listeners directly in `useEffect` hooks without debouncing causes layout thrashing and excessive re-renders, especially in expensive components like D3 visualizations.
**Action:** Always wrap `resize` event handlers with a `debounce` utility (e.g., 200ms delay) to throttle updates. Ensure the debounced function is stable across renders or properly cleaned up.
