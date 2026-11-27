---
"cncjs": minor
---

Custom iframe widgets now receive independent `widget:state` messages with `{ fullscreen: boolean }` on connect, reconnect, and fullscreen transitions. The `change` message contains only port and controller metadata.

Update widget receivers to handle `widget:state` before deploying this sender, using cncjs-widget-boilerplate #9 or equivalent support. The sender no longer includes fullscreen in `change` or emits `widget:fullscreenchange`.
