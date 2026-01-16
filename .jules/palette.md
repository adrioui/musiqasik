## 2024-05-23 - Custom Slider Accessibility
**Learning:** Custom interactive elements (like the audio progress bar) implemented as `div`s often lack keyboard support and ARIA roles, making them inaccessible to screen readers and keyboard-only users.
**Action:** When identifying custom widgets, ensure they implement appropriate roles (e.g., `role="slider"`) and keyboard handlers (e.g., `onKeyDown` for Arrow keys), or prefer native elements/accessible primitives where possible.
