## 2024-05-23 - Accessibility: Icon-Only Buttons
**Learning:** Icon-only buttons (like depth controls and theme toggles) were missing accessible names, making them difficult for screen reader users to identify.
**Action:** When creating icon-only buttons, always ensure an `aria-label` is provided to describe the button's action. The `title` attribute is helpful for tooltips but `aria-label` provides a more robust accessible name.

## 2024-05-23 - Accessibility: Radix UI Slider Labels
**Learning:** The Radix UI `Slider` primitive places `role="slider"` on the Thumb element, not the Root. Passing `aria-label` to the Root element (default `shadcn/ui` behavior) does not correctly label the slider for screen readers.
**Action:** When implementing or wrapping the `Slider` component, explicitly extract `aria-label` from props and pass it to the `SliderPrimitive.Thumb` element to ensure the interactive slider control has an accessible name.
