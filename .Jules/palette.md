## 2024-05-23 - Accessibility: Icon-Only Buttons
**Learning:** Icon-only buttons (like depth controls and theme toggles) were missing accessible names, making them difficult for screen reader users to identify.
**Action:** When creating icon-only buttons, always ensure an `aria-label` is provided to describe the button's action. The `title` attribute is helpful for tooltips but `aria-label` provides a more robust accessible name.

## 2025-02-18 - Accessibility: Custom Progress Bars
**Learning:** Custom `div`-based progress bars are inaccessible to keyboard users and screen readers unless explicitly enhanced.
**Action:** Use `role="slider"`, `tabIndex={0}`, `aria-valuenow`/`min`/`max`, and implement `onKeyDown` handlers for Arrow keys to provide equivalent functionality to native inputs.
