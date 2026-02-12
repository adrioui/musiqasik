## 2024-05-23 - Accessibility: Icon-Only Buttons
**Learning:** Icon-only buttons (like depth controls and theme toggles) were missing accessible names, making them difficult for screen reader users to identify.
**Action:** When creating icon-only buttons, always ensure an `aria-label` is provided to describe the button's action. The `title` attribute is helpful for tooltips but `aria-label` provides a more robust accessible name.

## 2024-05-23 - Accessibility: Custom Sliders
**Learning:** Custom `div`-based progress bars are inaccessible to keyboard and screen reader users. They lack roles, values, and keyboard handlers.
**Action:** Replace custom implementations with semantic `<input type="range">` or accessible libraries like `@radix-ui/react-slider`. This provides keyboard support (arrow keys), screen reader announcements, and focus management for free.
