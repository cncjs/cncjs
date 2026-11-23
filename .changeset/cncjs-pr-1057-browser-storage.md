---
"cncjs": patch
---

fix(config): preserve browser settings when Electron IPC is unavailable

Browser sessions that identify as Electron but do not expose desktop integration now load and save their workspace settings in browser storage. Desktop sessions with Electron integration continue using their existing configuration file.
