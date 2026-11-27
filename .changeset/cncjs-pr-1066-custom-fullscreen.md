---
"cncjs": patch
---

feat(widgets/Custom): report widget fullscreen state to the iframe

Custom widget iframes receive `{ fullscreen: boolean }` through `widget:fullscreenchange` on readiness/reconnect and on fullscreen transitions. Keep `change` messages limited to the existing controller and connection metadata.
