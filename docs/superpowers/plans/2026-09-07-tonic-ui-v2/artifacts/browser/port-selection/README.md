# BR0 Connection port selection

Date: 2026-09-07

## Result

PASS. A fresh bundled-Chromium Playwright session opened CNCjs from `yarn dev`, opened the Connection widget selector, found `/tmp/ttyGRBL` with manufacturer `Grbl Simulator`, selected it, and automatically established a Grbl connection.

## Evidence

- `01-initial.txt`: anonymous Workspace and Connection widget before opening the selector.
- `02-open-menu.txt`: selector menu contains `/tmp/ttyGRBL` and `Manufacturer: Grbl Simulator`.
- `02-open-menu.png`: selector menu screenshot.
- `03-selected.txt`: selected value is `/tmp/ttyGRBL`; Connection control changed to `Close` and Grbl widget state is `Idle`.
- `03-console.log`: browser console log from the session.
- `04-connected.png`: connected Workspace screenshot.

The dev-server log also recorded `socket.open("Grbl", "serial", {"path":"/tmp/ttyGRBL","baudRate":115200})` and `Connection established`.

## Environment

- Command: `yarn dev`
- Browser: Playwright bundled Chromium, headless
- Configuration: existing `~/.cncrc`; no `users` section added or changed
- Serial path: `/tmp/ttyGRBL`
- Manufacturer: `Grbl Simulator`

The browser session and dev server were stopped after the verification. The simulator removed `/tmp/ttyGRBL` during cleanup.
