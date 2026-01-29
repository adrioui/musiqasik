## 2024-05-23 - Accessibility: Icon-Only Buttons
**Learning:** Icon-only buttons (like depth controls and theme toggles) were missing accessible names, making them difficult for screen reader users to identify.
**Action:** When creating icon-only buttons, always ensure an `aria-label` is provided to describe the button's action. The `title` attribute is helpful for tooltips but `aria-label` provides a more robust accessible name.

## 2024-05-24 - Accessibility: Interactive Elements and Keyboard Navigation
**Learning:** Custom `div`-based progress bars exclude keyboard users as they are not focusable or interactive via standard keys.
**Action:** Always use semantic elements (like `<input type="range">` or accessible components like Radix Slider) for interactive controls to ensure they are focusable, announce their role/value to screen readers, and are operable via keyboard (Arrow keys).
