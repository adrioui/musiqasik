## 2025-02-12 - Debounce Resize Listeners
**Learning:** Resize listeners attached to React components, especially those driving expensive computations like D3 force graphs, must be debounced. In `ForceGraph`, the `useElementDimensions` hook was triggering updates on every resize frame, causing layout thrashing.
**Action:** Always wrap `resize` handlers in a `debounce` function with a ~200ms delay and ensure proper cleanup in `useEffect`.
