## 2024-05-22 - AudioPlayer Re-render Bottleneck
**Learning:** The `AudioPlayer` component was re-rendering the entire UI (album art, controls, metadata) every 250ms due to `currentTime` updates. This is a common pattern in media players but was unoptimized here.
**Action:** Isolate high-frequency state (`currentTime`) into leaf components (`TimeDisplay`, `ProgressBar`) and memoize static siblings (`AlbumArt`, `Controls`) using `React.memo`. This ensures only the changing pixels are diffed.
