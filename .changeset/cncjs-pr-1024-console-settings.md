---
"cncjs": minor
---

feat(console) Console widget: add settings for font size, terminal size and terminal colors, and fix the vertical scrollbar drifting out of view when scrolling horizontally.In fullscreen the terminal now fits the window width as well as its height. Commands that do not fit the terminal width are never sent truncated or hidden.

Choose a font size in pixels and preview it with the terminal colors before saving.

The terminal background options are Black and White. Existing background selections are preserved, and the cursor follows the text color.
