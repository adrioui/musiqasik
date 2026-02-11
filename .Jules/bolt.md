## 2025-05-20 - [D3 Force Graph Interaction Optimization]
**Learning:** Moving O(E) neighbor lookups from hover handlers to O(1) pre-calculated adjacency maps significantly improves interaction performance in large D3 graphs.
**Action:** When working with D3 visualizations that require interaction (highlighting neighbors), pre-calculate adjacency structures in a `useMemo` hook rather than iterating edges on every event.
