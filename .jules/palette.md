## 2025-05-23 - Custom Range Sliders
**Learning:** To make custom-styled progress bars accessible and interactive, use an invisible native `<input type='range'>` overlay (opacity-0, z-10) placed *before* the visual track in the DOM. This enables native keyboard/touch interactions and allows using `peer-focus-visible` to style the visual track when the invisible input is focused.
**Action:** Always wrap custom sliders in a relative container with an overlay input preceding the visual elements.
