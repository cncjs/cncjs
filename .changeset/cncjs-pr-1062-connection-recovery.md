---
"cncjs": patch
---

feat(pwa): optionally switch to the offline page after continuous HTTP failure

Set `connectionRecovery.action` to `"offline"` in `.cncrc` to switch to the self-reconnecting offline page after a fixed 30 seconds of continuous HTTP failure, starting at the first failed probe. Successful probes reset the timer, and switching requires a controlling service worker. The default `"reconnect"` action keeps the workspace open while the socket retries; missing or invalid values use this default. Normal offline navigation to the app root remains available independently.
