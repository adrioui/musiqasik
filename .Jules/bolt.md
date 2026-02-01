## 2025-02-18 - [Optimization] ForceGraph Neighbor Lookup
**Learning:** In D3 visualizations where interaction handlers (hover/click) are bound via `useEffect`, any instability in dependency functions (like helper callbacks) causes the effect to re-run, potentially re-binding all D3 events.
**Action:** Always wrap helper functions returned from hooks (like `getNeighbors`) in `useCallback` if they are intended to be used in dependency arrays of effects or other callbacks.
