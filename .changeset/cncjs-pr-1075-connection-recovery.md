---
"cncjs": patch
---

feat(pwa): optionally switch to the offline page after continuous HTTP failure

Set `connectionRecovery.offlineFallback` to `true` in `.cncrc` to switch to the offline page after 30 seconds of continuous HTTP failure, starting at the first failed probe. Successful probes reset the timer, and switching requires a controlling service worker. By default, CNCjs keeps the workspace open while the socket retries. Reloading or opening the app root while offline can still show the offline page with this setting disabled.
