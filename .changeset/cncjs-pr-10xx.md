---
"cncjs": patch
---

feat(pwa): optionally switch the installed app to the offline page when the server is switched offSet `offlineFailover.enabled` in `.cncrc` to have the installed app show the offline page, which reconnects by itself, after the server has been unreachable for `offlineFailover.timeout` seconds (default 30). It is off by default, so nothing changes unless you enable it.
