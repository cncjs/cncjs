---
"cncjs": patch
---

feat(widgets/Custom): report widget fullscreen state to the iframe

Custom widget iframes receive their current fullscreen state in the connect/reconnect change snapshot under `widget.fullscreen` and a boolean `widget:fullscreenchange` notification when entering or leaving fullscreen. Preserve the existing controller and connection message payloads on next.
