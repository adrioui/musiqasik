## 2024-05-23 - Accessibility: Icon-Only Buttons
**Learning:** Icon-only buttons (like depth controls and theme toggles) were missing accessible names, making them difficult for screen reader users to identify.
**Action:** When creating icon-only buttons, always ensure an `aria-label` is provided to describe the button's action. The `title` attribute is helpful for tooltips but `aria-label` provides a more robust accessible name.

## 2025-02-10 - Accessibility: Range Inputs
**Learning:** Custom `div`-based progress bars lack keyboard accessibility (arrow keys) and screen reader roles, making media control impossible for keyboard users.
**Action:** Replace custom seek bars with `@radix-ui/react-slider` (wrapped in a reusable `Slider` component) to gain automatic keyboard support, ARIA roles, and touch handling.
