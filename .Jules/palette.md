## 2024-05-23 - Accessibility: Icon-Only Buttons
**Learning:** Icon-only buttons (like depth controls and theme toggles) were missing accessible names, making them difficult for screen reader users to identify.
**Action:** When creating icon-only buttons, always ensure an `aria-label` is provided to describe the button's action. The `title` attribute is helpful for tooltips but `aria-label` provides a more robust accessible name.

## 2025-05-24 - Interaction: Minimalist Slider Controls
**Learning:** For media controls in a visual-heavy app ("The Living Gallery"), standard always-visible slider thumbs create visual clutter. Using `opacity-0 group-hover:opacity-100` allows controls to remain accessible (via large hit areas) but invisible until needed.
**Action:** Use the "reveal on hover" pattern for secondary interaction elements like seek bars, ensuring keyboard focus states remain visible independently of hover state.
