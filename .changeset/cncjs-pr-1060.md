---
"cncjs": minor
---

The Custom widget includes `payload.fullscreen` in the iframe's initial `change` message. When the widget enters or leaves full screen, it sends `widget:fullscreenchange` with the new boolean value in `payload.fullscreen`.
