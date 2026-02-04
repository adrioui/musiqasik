## 2024-05-23 - Accessibility: Icon-Only Buttons
**Learning:** Icon-only buttons (like depth controls and theme toggles) were missing accessible names, making them difficult for screen reader users to identify.
**Action:** When creating icon-only buttons, always ensure an `aria-label` is provided to describe the button's action. The `title` attribute is helpful for tooltips but `aria-label` provides a more robust accessible name.

## 2025-05-20 - Radix UI Slider Accessibility
**Learning:** Radix UI Slider requires `aria-label` on the `Thumb` primitive for screen readers to properly identify the control, not just the Root. Also requires `ResizeObserver` mock in JSDOM tests.
**Action:** Pass `aria-label` to Thumb and mock `ResizeObserver` in setup when using Radix primitives.
