# Palette's Journal

## 2024-05-22 - Native Inputs over Custom Divs

**Learning:** When creating custom sliders (like audio seek bars), using an invisible native `<input type="range">` overlaid on top of the custom visualization is far superior to re-implementing drag/click logic on a `div`. It provides immediate keyboard accessibility (arrow keys) and screen reader support (`role="slider"`) with zero extra code.

**Action:** Whenever a design calls for a custom slider, start with a native input opacity 0, and style a separate `div` underneath it using pointer-events-none.
