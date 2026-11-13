---
"cncjs": minor
---

feat(theme): add a light/dark theme setting

Adds a Theme option (Light or Dark) under Settings > General > Appearance. Light is the default and keeps the existing look. Colors are defined as CSS custom properties in `src/app/styles/theme.styl`, selected by a `theme-light` or `theme-dark` class on the document element that is applied at startup and when the setting is saved. Stylesheets and inline styles use the variables instead of hard-coded colors, `src/app/styles/theme-overrides.styl` covers components whose colors come from third-party CSS, and the Visualizer scene (grid, axes, labels, toolpath and canvas) takes its colors from a per-theme palette and recolors live when the theme changes.