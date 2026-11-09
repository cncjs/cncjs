# BR0 browser baseline

Task / source commit: BR0 / `394b3e24`

Environment:

- OS: Debian Linux
- Browser runner: global Playwright 1.62.1
- Browser: Playwright bundled Chromium (system Chrome channel is not used for screenshots)
- Viewport: 1440×900
- Headless: yes
- DPR: 1
- GPU: software/headless WebGL; application displayed its WebGL fallback
- Backend: `127.0.0.1:8000`
- App: `127.0.0.1:8080`
- Simulator TCP: `8888`
- Serial path: `/tmp/ttyCNCjsMigration`
- G-code SHA256: `e9f23b3146d2ac3d4ad39ed63a0af2f26b61e483ad495a5a4345806bef46517b`
- Watch tree: 4,900 directory files (100 directories × 49 files), plus 3 root fixtures

The watch tree and any large-fixture payload described here were generated for the historical browser run. They are runtime-only data and are not part of the current versioned fixture set.

Observed baseline:

- App loaded at `/#/workspace` with title `CNCjs 2.0.0-dev`.
- Workspace accessible snapshot contains Connection, Console, Grbl, Marlin,
  Smoothie, TinyG, Webcam, Visualizer, Axes, G-code, Macro, Autolevel, Probe,
  Tool, Spindle, and Laser regions.
- Empty-user config entered Workspace without a credential form; no password or
  token was saved.
- WebGL fallback dialog was visible under headless software rendering.
- No uncaught exception or TypeError was observed.
- Console baseline contains existing Tonic deprecation warnings, legacy
  `react-bootstrap-buttons` defaultProps warnings, React lifecycle warnings,
  and a favicon 404. These are recorded, not treated as migration passes.
- Administration/Macros loaded at `/#/administration/macros`; the New Macro
  dialog opened successfully.
- Appearance menu switched to Dark theme and back to Light theme; both theme
  snapshots were captured.

Artifacts:

- `commands.md` — exact setup and browser commands
- `br0-final-workspace.png` — authenticated Workspace screenshot
- `macros-modal-snapshot.yml`, `macro-modal.png` — New Macro dialog
- `theme-dark-snapshot.yml`, `theme-light-snapshot.yml`, `theme-light.png` — theme checks
- `br0-final-workspace.png` — fresh authenticated Workspace screenshot
- `br0-final-768x900.png`, `br0-final-768-snapshot.txt` — fresh narrow viewport evidence
- `port-selection/03-console.log` — fresh console/network evidence
- `port-selection/` — fresh selector open, `/tmp/ttyGRBL` selection, and Grbl connection evidence

Remaining BR0 coverage: Run/Pause/Resume/Stop/jog/disconnect commands and
large fixture load remain unverified. The selector and initial Grbl connection
are now verified in `port-selection/`; no credentials or token were saved.
