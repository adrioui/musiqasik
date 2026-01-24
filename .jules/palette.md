## 2024-05-23 - Custom Seek Bars

**Learning:** For custom-styled seek bars, using an invisible native `<input type='range'>` overlay placed *before* (or alongside) the visual track ensures best-in-class accessibility (keyboard, screen reader) without fighting browser-specific styling for the track/thumb.
**Action:** Use the "Invisible Input Overlay" pattern for all progress bars that need interaction. Ensure `onPointerDown`/`Up` handles dragging state to prevent playback jitter.
