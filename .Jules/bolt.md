# Bolt's Journal

## 2024-05-22 - [AudioPlayer Re-renders]
**Learning:** High-frequency state updates (e.g., `currentTime` in a media player) mixed with static UI elements cause excessive re-renders of the entire component tree.
**Action:** Isolate the high-frequency state into a dedicated leaf component or strictly memoize static siblings (like Album Art and Controls) to prevent wasted reconciliation cycles.
