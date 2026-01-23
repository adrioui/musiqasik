## 2025-05-23 - Custom Sliders Accessibility
**Learning:** The application implemented the audio player seek bar using clickable `div` elements, which lacked keyboard support and ARIA roles, excluding screen reader and keyboard-only users.
**Action:** Replace custom `div` sliders with native `<input type="range">` elements (using an invisible overlay technique if needed) to provide built-in accessibility (keyboard navigation, proper roles/values) while maintaining the desired visual design.
