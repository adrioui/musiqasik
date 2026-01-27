## 2024-05-23 - Accessibility: Icon-Only Buttons
**Learning:** Icon-only buttons (like depth controls and theme toggles) were missing accessible names, making them difficult for screen reader users to identify.
**Action:** When creating icon-only buttons, always ensure an `aria-label` is provided to describe the button's action. The `title` attribute is helpful for tooltips but `aria-label` provides a more robust accessible name.

## 2026-01-27 - Accessibility: Custom Seek Bars
**Learning:** Custom-styled progress bars implemented as `div`s with click handlers lack essential accessibility features (keyboard seeking, screen reader values, drag support).
**Action:** Use an invisible `<input type="range">` overlay (`opacity-0`) on top of the visual track. This provides native accessibility (keyboard navigation, drag, touch) and semantic value while maintaining exact visual control.
