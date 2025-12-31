## 2024-05-23 - Accessibility: Icon-Only Buttons
**Learning:** Icon-only buttons (like depth controls and theme toggles) were missing accessible names, making them difficult for screen reader users to identify.
**Action:** When creating icon-only buttons, always ensure an `aria-label` is provided to describe the button's action. The `title` attribute is helpful for tooltips but `aria-label` provides a more robust accessible name.

## 2024-05-23 - Accessibility: Dynamic Icon Buttons
**Learning:** Buttons that change their icon to indicate state (e.g., "Copy" becoming "Check") need to update their accessible name to reflect the new state. A static `aria-label` like "Copy" is confusing when the visual state indicates success.
**Action:** Use conditional `aria-label` strings (e.g., `aria-label={copied ? "Link copied" : "Copy share link"}`) to ensure screen reader users get the same immediate feedback as sighted users.
