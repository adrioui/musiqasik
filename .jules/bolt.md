## 2025-05-21 - Debouncing Resize for D3
**Learning:** React state updates on `resize` event cause frequent re-renders. For D3 simulations (`ForceGraph`), this leads to expensive restart computations and layout thrashing.
**Action:** Always debounce resize listeners that drive expensive visual updates like graphs or canvas.
