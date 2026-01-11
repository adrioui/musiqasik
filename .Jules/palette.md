## 2024-05-23 - Accessibility: Icon-Only Buttons
**Learning:** Icon-only buttons (like depth controls and theme toggles) were missing accessible names, making them difficult for screen reader users to identify.
**Action:** When creating icon-only buttons, always ensure an `aria-label` is provided to describe the button's action. The `title` attribute is helpful for tooltips but `aria-label` provides a more robust accessible name.

## 2025-05-25 - Accessibility: Custom Sliders
**Learning:** Custom div-based sliders/progress bars (like in the audio player) are inaccessible by default. They need explicit roles and keyboard handling.
**Action:** When building custom sliders, always add `role="slider"`, `tabIndex={0}`, `aria-valuenow`/`min`/`max` attributes, and `onKeyDown` handlers for arrow keys to ensure screen reader and keyboard accessibility.
