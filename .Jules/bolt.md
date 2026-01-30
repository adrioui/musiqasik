# Bolt's Journal

## 2025-05-20 - Force Graph Interaction Optimization
**Learning:** D3 force graph interactions (like hover) can trigger frequent updates. Iterating over all edges (O(E)) in `onMouseEnter` or similar handlers causes significant lag on large graphs.
**Action:** Always pre-calculate adjacency lists (O(1) lookup) using `useMemo` for any graph interaction logic.
