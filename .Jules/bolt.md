## 2026-01-26 - O(1) Graph Neighbor Lookup

**Learning:** D3 graph interactions like hover effects can become slow O(E) operations if implemented by iterating links on every event. Pre-calculating an adjacency list using `useMemo` reduces this to O(1).
**Action:** Always pre-calculate adjacency structures for graph components when interaction performance is critical.
