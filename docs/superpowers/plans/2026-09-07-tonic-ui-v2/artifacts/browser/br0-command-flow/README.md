# BR0 command-flow evidence

Date: 2026-09-07. Source commit: `394b3e24`.

## Environment and command

- OS: Debian Linux; Node `v24.13.1`; Yarn `3.3.1`.
- Browser: Playwright MCP bundled Chromium, headless, DPR 1. `google-chrome --headless=new --no-sandbox --version` was attempted and failed because Chrome could not create its default profile; no system Chrome screenshots were used.
- Exact startup: `yarn dev` from repository root. First sandbox attempt exited 1 with simulator `listen EPERM`; elevated retry started successfully. The simulator, backend, and frontend were owned by this lifecycle only.
- App URL: `http://127.0.0.1:8080/#/workspace`. Backend logged `http://127.0.1.1:8000`; simulator allocated TCP `38707` and bridged `/tmp/ttyGRBL`.

## Verified actions

1. Anonymous access opened Workspace directly. `01-initial-1440.yml` and `02-workspace-1440.yml` capture the initial accessible UI; no credential form was required.
2. Initial WebGL modal condition: no `WebGL` match was present in the accessible snapshot, so no dismiss action was performed. `02-workspace-1440.png` is the 1440x900 screenshot.
3. Connection selected `/tmp/ttyGRBL`; UI displayed manufacturer `Grbl Simulator` and baud `115200`. `03-selected-1440.yml` records the path and `04-connected-1440.png` records the connected UI. Grbl status was `Idle`; the connection control changed to `Close`.
4. A compact synthetic fixture was uploaded from `src/app/test/fixtures/browser/br0-small.gcode` (SHA256 `08c3db3f70e0f311bd9f30033191578605b7b8c240a8a2fcb2952fd261a842cd`). The browser reached a runtime failure: `TypeError: str.split is not a function` in `gcode-parser` via `GCodeVisualizer.render`. `06-small-gcode-error-1440.yml` records the error overlay. Run/Pause/Stop remained disabled in `05-small-gcode-loaded-1440.yml`; therefore workflow command sequence is not proven.
5. A disconnect click was attempted after reload. The React refresh/error overlay intercepted normal clicks; a forced click did not change the visible connected state. `07-disconnect-attempt-1440.yml` records this blockage.
6. `08-workspace-768.yml` and `08-workspace-768.png` capture the required 768x900 viewport. No jog controls were used.

## Artifacts

- `01-initial-1440.yml`, `02-workspace-1440.yml`, `03-selected-1440.yml`, `05-small-gcode-loaded-1440.yml`, `06-small-gcode-error-1440.yml`, `07-disconnect-attempt-1440.yml`, `08-workspace-768.yml`: accessible snapshots.
- `02-workspace-1440.png`, `04-connected-1440.png`, `08-workspace-768.png`: screenshots.
- The accessible snapshots record the parser error and error overlay. Raw
  console/network logs were removed because they contained an anonymous JWT.

## Untested / blocked

- Run, Pause, Resume, Stop, successful small-G-code execution, and successful browser disconnect remain untested because the upload raised the runtime error and its overlay blocked subsequent controls.
- Required 100,000-line fixture, 5,000-node watch tree, and watch-directory large-file cases were not created or run.
- No physical jog was attempted.

## Cleanup

The elevated `yarn dev` session was stopped with Ctrl-C and exited 0. `/tmp/ttyGRBL` was absent afterward; process scan found no simulator/backend/frontend child, and curls to ports 8080 and 8000 failed as expected. No browser credentials or tokens were stored.

Reviewer gate: blocked by the named G-code parser runtime error and overlay interception; this evidence does not claim BR0 complete.
