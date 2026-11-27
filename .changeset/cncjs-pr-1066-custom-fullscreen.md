---
"cncjs": patch
---

feat(widgets/Custom): report widget fullscreen state to the iframe

Custom widget iframes receive `{ fullscreen: boolean }` through `widget:state` on readiness/reconnect and on fullscreen transitions. Keep `change` messages limited to the existing controller and connection metadata.
