## 2025-05-18 - Input Validation in Workers
**Vulnerability:** Worker endpoint `/api/lastfm/session` accepted arbitrary strings as `token` and passed them to the Last.fm API.
**Learning:** Cloudflare Workers often act as proxies; developers might skip validation assuming the upstream API handles it. This wastes resources and exposes upstream APIs to malformed data.
**Prevention:** Always validate input formats (regex, length, type) at the edge before processing or forwarding requests.
