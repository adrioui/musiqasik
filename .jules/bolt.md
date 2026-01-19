## 2024-05-22 - ForceGraph D3 Simulation Restart on Resize
**Learning:** The `ForceGraph` component restarts the expensive D3 simulation whenever dimensions change. Using a synchronous `resize` listener in `useElementDimensions` caused layout thrashing and simulation restarts on every frame during window resize.
**Action:** Always debounce dimension-tracking hooks (like `useElementDimensions`) when they drive expensive re-calculations or simulations, especially in D3-integrated components.
