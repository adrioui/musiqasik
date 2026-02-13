## 2024-05-23 - Accessibility: Icon-Only Buttons
**Learning:** Icon-only buttons (like depth controls and theme toggles) were missing accessible names, making them difficult for screen reader users to identify.
**Action:** When creating icon-only buttons, always ensure an `aria-label` is provided to describe the button's action. The `title` attribute is helpful for tooltips but `aria-label` provides a more robust accessible name.

## 2024-05-24 - Accessibility: Custom Progress Bars vs Radix UI Slider
**Learning:** Custom `div`-based progress bars are fundamentally inaccessible without significant ARIA implementation (roles, valuemin, valuemax, valuenow) and keyboard handling. `@radix-ui/react-slider` provides all these features (keyboard navigation, ARIA attributes) out-of-the-box, saving development time and ensuring compliance.
**Action:** Always prefer `@radix-ui/react-slider` over custom `div` implementations for range inputs or progress bars that need interaction. Note: Radix UI primitives require a `ResizeObserver` polyfill in JSDOM testing environments.
