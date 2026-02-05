## 2024-05-23 - Accessibility: Icon-Only Buttons
**Learning:** Icon-only buttons (like depth controls and theme toggles) were missing accessible names, making them difficult for screen reader users to identify.
**Action:** When creating icon-only buttons, always ensure an `aria-label` is provided to describe the button's action. The `title` attribute is helpful for tooltips but `aria-label` provides a more robust accessible name.

## 2024-05-24 - Interaction: Media Slider State Management
**Learning:** When using Radix UI Sliders for media playback progress, binding the slider value directly to the player's current time creates jitter while dragging. The player tries to update the slider while the user is trying to move it.
**Action:** Use `onValueChange` to manage a local `isDragging` state and update the visual slider immediately, but only trigger the actual seek operation (media update) in `onValueCommit` when the user releases the handle.
