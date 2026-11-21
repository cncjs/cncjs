---
"cncjs": patch
---

Fix workspace settings in embedded browsers that report an Electron user agent but do not expose Node APIs. These browsers use local storage; the CNCjs desktop app still uses its existing settings file.
