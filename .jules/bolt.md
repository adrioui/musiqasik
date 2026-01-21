## 2025-05-23 - [Graph Interaction Optimization]
**Learning:** `ForceGraph` neighbor lookups were O(E) inside `onMouseEnter`, causing potential performance issues on large graphs.
**Action:** Use `useGraphNeighbors` (O(1) adjacency map) for instant hover feedback. Always pre-calculate adjacency lists for graph interaction handlers.
