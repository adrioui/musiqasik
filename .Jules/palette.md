## 2024-05-23 - Accessibility: Icon-Only Buttons
**Learning:** Icon-only buttons (like depth controls and theme toggles) were missing accessible names, making them difficult for screen reader users to identify.
**Action:** When creating icon-only buttons, always ensure an `aria-label` is provided to describe the button's action. The `title` attribute is helpful for tooltips but `aria-label` provides a more robust accessible name.

## 2024-05-24 - Accessibility: Custom Sliders
**Learning:** Custom visual sliders (using divs) often lack keyboard support and screen reader accessibility. Using an invisible native `<input type="range">` overlaid on the custom visuals provides robust accessibility (keyboard navigation, touch drag, semantic value) without compromising the design.
**Action:** Wrap custom progress bars in a container with a native `input[type=range]` (opacity 0) that covers the visual area. Ensure the input handles interaction and syncs state, and use `peer-focus-visible` on the visual track to show focus rings when the invisible input is focused.
