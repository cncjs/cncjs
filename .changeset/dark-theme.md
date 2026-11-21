---
"cncjs": minor
---

feat(theme): add a light/dark theme setting ([#1028](https://github.com/cncjs/cncjs/pull/1028))

Adds a Color mode option (Light or Dark) under Settings > General > Appearance. Light is the default and keeps the existing look. The server applies the saved color mode in the initial HTML, including on the loading and sign-in pages, so a saved Dark mode does not start with a Light flash. The setting is shared by all browsers using the same server. App styles use the color tokens in `src/app/styles/theme.styl`, and the Visualizer recolors its scene when the mode changes.