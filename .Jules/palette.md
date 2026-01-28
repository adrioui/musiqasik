## 2024-05-23 - Accessibility: Icon-Only Buttons
**Learning:** Icon-only buttons (like depth controls and theme toggles) were missing accessible names, making them difficult for screen reader users to identify.
**Action:** When creating icon-only buttons, always ensure an `aria-label` is provided to describe the button's action. The `title` attribute is helpful for tooltips but `aria-label` provides a more robust accessible name.

## 2024-05-24 - Semantic Sliders vs Custom Divs
**Learning:** Replacing custom `div`-based progress bars with semantic `input type='range'` (or libraries like Radix Slider) provides immediate accessibility wins (keyboard support, screen reader roles) and better interaction (dragging, touch support) with less code than implementing custom handlers.
**Action:** When implementing seek bars or volume controls, always prefer semantic slider components to ensure they are accessible and interactive by default.
