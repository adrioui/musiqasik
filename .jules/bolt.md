## 2024-05-23 - Debounce Resize Listener

**Learning:** Window resize events fire extremely rapidly, causing expensive D3 force simulation restarts and layout thrashing in React components.

**Action:** Debounce window resize event listeners that trigger state updates, especially when those updates drive expensive re-renders or calculations (like D3 graphs). Use a 200ms delay and ensure the debounce function is cancellable for cleanup in `useEffect`.
