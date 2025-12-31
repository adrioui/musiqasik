# Bolt's Journal

## 2024-05-22 - [Initialization] **Learning:** Bolt journal initialized. **Action:** Record critical performance learnings here.

## 2024-05-22 - [D3 React Integration] **Learning:** Splitting `useEffect` hooks in D3 components can significantly improve performance. Specifically, separating heavy graph rebuilds (structure changes) from lightweight updates (opacity/style toggles) prevents unnecessary DOM destruction and recreation. **Action:** When optimizing D3 in React, always check if `useEffect` dependencies trigger full rebuilds for simple visual changes and refactor into separate effects.
