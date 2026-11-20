---
"cncjs": patch
---

Fix duplicate serial port entries in the Connection widget when a port listed in the `ports` section of `.cncrc` is also auto-detected. Detected and configured ports are now merged by path, with `.cncrc` values (e.g. `manufacturer`) taking precedence. Ports that are only detected or only configured are unchanged.
