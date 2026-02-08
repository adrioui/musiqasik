## 2025-02-18 - [Optimization] O(1) Adjacency List for Force Graph

**Learning:** D3 Force simulations mutate link objects in place, changing `source` and `target` properties from string IDs to object references. Any pre-calculation logic (like building an adjacency list for hover performance) must robustly handle both types to avoid runtime errors during re-renders or re-simulations.

**Action:** When optimizing D3 graph lookups, always normalize `link.source.id || link.source` (and target) to handle both pre- and post-simulation states.

**Learning:** Visual verification of D3 graphs requires valid mock data for `artist.getsimilar` endpoints. Mocking only `artist.getinfo` is insufficient because the graph component may not render isolated nodes without valid link data.

**Action:** Ensure `artist.getsimilar` is mocked with a valid list of matches in verification scripts.
