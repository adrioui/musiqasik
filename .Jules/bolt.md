## 2024-05-22 - D3 Interaction Optimization

**Learning:** Event handlers in D3 visualizations (like hover) often iterate over all data points (e.g., edges) to find related elements. This O(N) operation on every frame/event can cause jank. Pre-calculating adjacency lists/lookups using `useMemo` reduces this to O(1).
**Action:** When working with graph visualizations, always pre-calculate neighbor maps or lookup tables if they are needed for interaction.
