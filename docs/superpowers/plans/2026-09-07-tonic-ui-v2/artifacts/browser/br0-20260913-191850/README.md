# BR0 bounded browser retry — 2026-09-13

Status: **in_progress / blocking**. Durable evidence was captured, but BR0 is not complete.

## Result

- Anonymous Workspace loaded at `http://127.0.0.1:8080/#/workspace`.
- React Select port selection worked using the existing visible parent control for `#react-select-2-input`; no `data-test` attribute or source change was needed.
- Selecting `/tmp/ttyGRBL` auto-connected Grbl at 115200. Durable body/state evidence showed `Close`, `Grbl`, and `Idle`.
- `br0-small.gcode` uploaded successfully; 7-line stats rendered with no gcode-parser split/type error, date-fns GCodeStats overlay, or page error.
- Run, Pause, and Resume were captured with button-state evidence.
- Stop was not captured: the short fixture completed before the bounded Stop click. This is the first blocking workflow gap.

## Gaps / not run

Jog press/release, post-disconnect disabled-control verification, the deterministic 100,000-line fixture, and the 5,000-node watch case were not completed after the Stop gap. The exact retry was interrupted during bounded cleanup; no further browser actions were taken.

## Browser

Direct Playwright fallback was used after the in-app browser reported no `iab` instance. Controlled Chromium: Playwright cache `chromium-1234`, version `151.0.7922.34`; headless, fresh temporary context, DPR 1, light color scheme, GPU disabled, viewport 1440×900 and 768×900. No system Chrome or Chrome screenshot channel was used.

## Evidence

Initial, React Select, upload, workflow, HTML, ARIA, screenshot, console, page-error, HTTP-error, network, and button-state artifacts are in this directory. See `commands.md` and `results.json` for the bounded command record and assertion matrix.

## Cleanup

The worker lifecycle was stopped with Ctrl-C; its server, webpack, simulator, serial bridge, and worker-launched controlled Chromium processes were stopped. Final verification found ports 8000 and 8080 absent and `/tmp/ttyGRBL` absent.
