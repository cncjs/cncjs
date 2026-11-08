# BR0 Playwright CLI retry

Date: 2026-09-07. Browser: Playwright bundled Chromium, headless, DPR 1.

## Result

This is partial evidence, not a completed BR0 run.

- Anonymous Workspace opened at `/#/workspace` in 1440×900 and 768×900.
- The Linux headless WebGL error modal was present.
- The retry uploaded `src/app/test/fixtures/browser/br0-small.gcode`.
- After upload, `str.split is not a function` and the React error overlay were both absent.

The automation selected the disabled `Close G-code file` button instead of the
modal's portal `OK` button. The modal overlay then prevented Connection port
selection. The selector had no `/tmp/ttyGRBL` option in this run, so the
Workflow controls remained disabled. Connection/disconnect and
Run/Pause/Resume/Stop are not verified here.

## Artifacts

- `01-workspace-1440.*`, `02-port-1440.*`, `03-after-upload-1440.*`, and
  `04-workspace-768.*`: accessible snapshots and screenshots.
- `events.json`: assertion summary, including no parser type error after upload.
- `fatal.txt`: exact portal-overlay interception failure.

The raw console log was removed because it was large, contained only existing
warnings, and failed repository whitespace validation.

The worker lifecycle stopped before handoff. Root verified ports 8000 and 8080
were closed and removed its leftover `/tmp/ttyGRBL` symlink.
