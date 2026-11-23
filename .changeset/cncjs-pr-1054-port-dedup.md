---
"cncjs": patch
---

fix(connection): deduplicate configured serial ports on next

Merge detected and configured serial ports by their exact path, preserving first-seen order and allowing configured metadata to override detected values.
