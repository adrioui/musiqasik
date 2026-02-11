## 2024-05-23 - Accessibility: Icon-Only Buttons
**Learning:** Icon-only buttons (like depth controls and theme toggles) were missing accessible names, making them difficult for screen reader users to identify.
**Action:** When creating icon-only buttons, always ensure an `aria-label` is provided to describe the button's action. The `title` attribute is helpful for tooltips but `aria-label` provides a more robust accessible name.

## 2025-05-23 - Component Selection: Native Inputs vs Libraries
**Learning:** For simple interactive components like sliders, native HTML5 inputs (`<input type="range" />`) provide built-in accessibility (keyboard navigation, screen reader support) without the overhead of external dependencies. They can be effectively styled with Tailwind and CSS variables to match custom designs.
**Action:** Evaluate if a native HTML element can fulfill the requirement before introducing a new UI library dependency, especially for lightweight or single-use components.
