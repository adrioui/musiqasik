## 2024-05-23 - Accessibility: Icon-Only Buttons
**Learning:** Icon-only buttons (like depth controls and theme toggles) were missing accessible names, making them difficult for screen reader users to identify.
**Action:** When creating icon-only buttons, always ensure an `aria-label` is provided to describe the button's action. The `title` attribute is helpful for tooltips but `aria-label` provides a more robust accessible name.

## 2024-05-24 - Accessibility: Radix UI Slider Labeling
**Learning:** The Radix UI `Slider` primitive applies the `role="slider"` to the `Thumb` element, not the `Root`. Placing `aria-label` on the `Root` (as typically done with prop spreading) results in the label failing to associate with the slider role.
**Action:** Explicitly pass `aria-label` to the `SliderPrimitive.Thumb` component when creating a wrapper, ensuring screen readers announce the label correctly when focusing the interactive element.
