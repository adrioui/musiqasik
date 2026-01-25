## 2025-05-23 - Accessible Custom Seek Bar
**Learning:** Using a `div` with `onClick` for seek bars excludes keyboard users and relies solely on pointer events. An invisible `<input type="range">` overlay provides full accessibility (keyboard navigation, screen reader support) while allowing complete visual customization of the track.
**Action:** Always use native inputs for interactive sliders, using the "invisible overlay" pattern if the visual design is highly custom.
