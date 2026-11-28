---
"cncjs": minor
---

Add Progressive Web App support. CNCjs now ships a web app manifest and a minimal service worker, so it can be installed as a standalone app on supported browsers (HTTPS or localhost required; plain HTTP keeps working as before). When the server is unreachable, a cached offline page is shown, and it reloads the app automatically once the server is back.
