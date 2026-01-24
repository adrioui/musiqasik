## 2024-05-22 - D3 Mutation Handling in React Hooks

**Learning:** D3 force simulations mutate `link.source` and `link.target` from strings/indices to object references in place. When extracting logic into React hooks (like `useGraphNeighbors`), one must handle both states (string ID vs object reference) to prevent runtime crashes or logic errors, especially when the hook runs during/after simulation ticks.

**Action:** Always check the type of `source`/`target` in D3-related hooks (e.g. `typeof link.source === 'string'`) or normalize the data before passing it to the hook.
