# BR0 browser verification checkpoint — blocked

Date: 2026-09-13 (Asia/Taipei)
Source revision: `62ea82cab0c680596ac89318b100be15133f1b63`
Session: `br0-20260913-185821`

## Status

BR0 remains `in_progress` and blocked by `BR0-B06-browser-runner-timeout` (root correction: `BR0-B05` is the resolved simulator-environment blocker).
The fresh Playwright Chromium session reached the anonymous Workspace and selected
`/tmp/ttyGRBL`, but the browser runner timed out immediately afterward while
interacting with the connection workflow. The exact command produced only:

```text
selected
```

and then exceeded the 30-second command limit without an exit code. No retry was
made after the requested checkpoint.

Unblock condition: provide a functioning browser runner/session that completes the
post-selection `Open` interaction within the browser command timeout, then rerun
the full BR0 procedure. The server and simulator are not the blocker in this retry.

## Evidence captured

- [workspace-1440x900.png](./workspace-1440x900.png): fresh anonymous Workspace screenshot.
- The initial accessible snapshot was captured in runner output; it showed the
  Workspace route, Connection widget, Grbl/115200 controls, disabled Open button,
  Visualizer, Axes, and other widgets. It was not persisted because the runner
  timed out before the checkpoint.
- Browser reached `http://127.0.0.1:8080/#/workspace`, title `CNCjs 2.0.0-dev`.
- The selected port list visibly included `/tmp/ttyGRBL` with manufacturer
  `Grbl Simulator`.
- Server logs observed the later serial open request for Grbl at 115200 during
  cleanup output, but this is not treated as a completed browser assertion because
  the corresponding browser interaction did not return durable evidence.

## Browser environment

Playwright Python fallback was used because the in-app browser runtime reported no
available browser instances (`agent.browsers.list()` returned `[]`). Browser was
the installed Playwright Chrome for Testing executable, version `151.0.7922.34`;
headless; fresh context/profile; DPR `1`; light color scheme; viewport
`1440x900`. The `768x900` viewport was not run. System Chrome was not used.

## Fixtures and setup

Active config was copied to `/tmp/cncjs-browser-test.cncrc`; no credentials,
tokens, browser storage state, or private files were used. Runtime watch data was
copied to `/tmp/cncjs-browser-watch` from the durable synthetic tree.

- `br0-small.gcode`: SHA-256 `08c3db3f70e0f311bd9f30033191578605b7b8c240a8a2fcb2952fd261a842cd`
- `br0-large-100000.gcode`: SHA-256 `45397ed84742e57ba0941be8c0035736bb5d39e6903a6cf7c5848ba985b2f19c`
- watch tree: 100 directories and 4,900 files (5,000 payload nodes excluding root)

## Warnings and errors

Baseline browser output included the known Tonic deprecation/defaultProps/findDOMNode
warnings, favicon/resource 404, Three.js legacy geometry warnings, and no page
errors before the timeout. No new product error was established. Source was not
edited.

## Untested paths

All remaining BR0 gates are untested or incomplete: 768x900 capture, connection
assertion, small/large G-code upload, GCodeStats/date-fns overlay check, run /
pause / resume / stop / close sequence, jog release, disconnect controls,
5,000-node watch-tree UI timing, durable accessible snapshots, and browser-level
console capture for the complete flow.

## Cleanup

Only this worker's lifecycle was stopped. `yarn dev` exited `0` after Ctrl-C
cleanup. TCP ports 8000 and 8080 had no listeners afterward, and `/tmp/ttyGRBL`
was absent.
