# Validation scope

## Reproduce the offline checks

From this directory, run:

```sh
node verify-project.cjs
```

Node.js 18 or newer is required. No external packages, running CNCjs server or CNC controller are required. The suite consists of 48 browser-side test scripts plus script syntax and HTML resource checks, for 50 checks in this source package. The runner uses an explicit list and does not launch the visual fixture or hardware checks.

The backend (job service, event stream, motion preflight, probe input and the `api.touch` handlers) is tested with the root Jest suite instead:

```sh
yarn test src/server/services/touch src/server/api/__tests__/api.touch.test.js
```

Those tests cover controller freshness and identity, confirmation issue/expiry/revocation, stream rotation and cleanup, raw-report state, probe-pin parsing, motion preview blocking, and the session/status-code mapping of the HTTP layer. One of them also checks every serialized backend packet against the browser protocol validator in `touch/job-stream.js`.

Browser-side coverage includes G2/G3 preview handling, worker cancellation and bounded transfers, library lifecycle and payloads, job display, simulation alarms and movement, probe preparation, history, screen blanking, hidden views and viewport scheduling. Controllers, network responses and most DOM behavior are mocked. Passing either suite does not prove correct physical motion, browser rendering or real-time operation.

An optional report can be written outside the source tree:

```sh
node verify-project.cjs --report /absolute/path/to/offline-report.json
```

## Latest regression coverage (2026-10-16)

The refreshed suite also covers FR/EN/ES messages and exports, storage conflicts and readback, temporary download cleanup, protocol schema/ordering, clock corrections, job-aware screen blanking, controller generation changes, offline recovery and hidden-page/browser-cache return. Old replies cannot reopen a confirmation; reconnects do not replay commands. All checks use offline mocks.

## Prior development observations

During development, separate workstation browser checks covered seven views at 1366 × 768, 1024 × 600 and 800 × 480 without measured page overflow. Ten navigation cycles showed stable instrumented timer/worker/observer counts. These measurements are limited to the observed resources and do not establish the absence of every memory leak.

A dense synthetic 20 MiB preview containing roughly 2.33 million segments took about 5.7 seconds for initial preview/payload generation and 5.4 seconds for Blob regeneration on the development PC. No long task of at least 50 ms was observed in those runs; maximum heartbeat delay was about 30 ms. These are workstation observations, not Surface RT performance guarantees or network benchmarks. The optional browser harness and local reports are not part of this minimal source handoff.

## Preview pipeline measurements (2026-10-16)

Measured on the development PC (Node.js 24, Chromium browser pane), not on the Surface. Methodology: `node test-preview-worker.cjs --20mb` (real worker thread, fake canvas) and, in the browser, `CNCLibraryPreview.render()` on a synthetic 300 000-line file (5.4 MB, 321 599 segments) with phase timestamps taken from the progress messages.

| Measure | Before | After |
| --- | --- | --- |
| Parser, one pass over 20 MB of dense lines (Node) | 1 641 ms | 440 ms |
| Parser, one pass over 20 MB of typical lines (Node) | 1 168 ms | 418 ms |
| Full pipeline, 20 MB dense, 2.33 M segments (Node) | 15 428 ms | 8 467 ms |
| Parser on the UI thread, 5.4 MB (browser) | 345 ms | 79 ms |
| Worker parse + draw phases, 5.4 MB (browser) | ~630 ms | ~215 ms |

Two changes produced this: the worker now keeps up to three geometry blocks in flight instead of pausing after every block until it is acknowledged, so parsing and drawing overlap; and the parser splits lines with `indexOf`, skips comment stripping on lines without `(` or `;`, and tokenizes plain `letter number` words by hand, falling back to the original regular-expression path for anything else. The fallback keeps the semantics identical: a differential run of 20 000 random programs (19 665 of them invalid) gave the same segment counts, bounds and error messages from both versions.

Two approaches were tried and rejected because the end-to-end numbers got worse or did not move: stroking runs of segments as one path (3× faster to issue, but up to 9× slower once the GPU process rasterizes the multi-subpath strokes) and replacing the drawing slice cadence with a MessageChannel yield (no measurable effect: the draw phase is bounded by parsing, not by timer clamping). Keep measuring with forced rasterization or phase timestamps, never with JavaScript issue time alone.

Caveat: in a browser page that is not being displayed, `canvas.toBlob()` waits about one second for an idle period before encoding, so the "Encodage" phase measured about 1 000 ms here regardless of the code; the synchronous PNG encode of the same 960 × 540 canvas took 3 ms. This still needs to be observed on the real, visible touchscreen.

## Measuring on the device

Open either page with `?perf=1` (for example `…/touch/index.html?perf=1`). A small badge appears bottom-right with the live median frame gap, the 95th percentile, the number of long tasks and `CPU` or `GPU` (from the WebGL renderer string: SwiftShader, llvmpipe or no WebGL means software rendering, which is the expected case for Chromium on a Tegra 3 under Linux). Use the interface normally for a few minutes: menu, files, preview, follow-up screen during a simulated job, settings. Tap the badge to download `cnc-touch-perf-<timestamp>.json`.

The report contains device information, the renderer, frame-gap statistics (median, p95, p99, max, count over 50 ms), long tasks, JS heap range, time spent per screen, the number of state updates and the phase timings of each preview generation. It contains no G-code, no file names and no machine state. Without `?perf=1` the script does nothing: no listeners, no timers, no DOM.

## Integrated server run (2026-10-16)

Environment: Windows 11, Node.js 24.20, the Chromium browser pane of the development tool, `yarn build-dev` then `yarn start-server-dev` (`NODE_ENV=development`, `output/cncjs`) with `-c` pointing at a throwaway `.cncrc` holding one enabled local user and `-w` pointing at a folder containing a seven-line `carre-test.nc`. No controller and no serial port were involved; the Raspberry Pi was not touched. The CNCjs app was opened at the server root, the test user signed in through the normal login form, then `/touch/index.html` was opened in the same browser.

Responses observed with `curl`, token obtained from `POST /api/signin` with the user's name and password (`{"enabled":true,"token":"…","name":"touch-test"}`; a wrong password gave `401 {"msg":"Authentication failed"}`):

| Request | Response |
| --- | --- |
| `GET /touch/`, `/touch/index.html`, `/touch/simulation.html`, `/touch/cnc-state.js` | `200`, `text/html` / `application/javascript`, no token needed |
| `GET /socket.io/socket.io.js` | `200 application/javascript` |
| `GET /api/custom/health` without token, or with a malformed token | `401 {"message":"Session CNCjs requise."}` |
| `GET /api/custom/health` with `Authorization: Bearer <jwt>` | `200 {"loaded":true,"version":"3.0.0","protocol":1,"transport":"ndjson"}` |
| `GET /api/touch-job` with token | `200 {"version":1,"epoch":"…","sequence":1,"sentAt":…,"controllers":[]}` |
| `GET /api/touch-job` without token | `401 {"message":"Session CNCjs requise."}` |
| `POST /api/touch-job` `{}` with token | `409 {"message":"Choisissez une machine."}` |
| `POST /api/touch-motion/preview` with token, body `{"port":"COM9","axis":"X","direction":1,"step":1,"feed":800}` | `409 {"message":"Contrôleur Grbl prêt et connecté requis."}` |
| same with an incomplete body (`{}` or `{"port","gcode"}`) | `409 {"message":"Axe, sens, pas ou vitesse invalide."}` |
| `GET /api/touch-events` with token, kept open 3.5 s | `200`, `Content-Type: application/x-ndjson; charset=utf-8`, `Cache-Control: no-store, no-transform`, `X-Accel-Buffering: no`, chunked; first line a full snapshot with `transportId`, then one heartbeat line per second (`sequence` 2, 3, 4, 5, `controllers: []`) |
| `GET /api/touch-events` without token | `401 {"message":"Session CNCjs requise."}` |
| `GET /api/watch/files` with token | `200 {"path":"","files":[{"name":"carre-test.nc","type":"f","size":65,…}]}` |

In the browser, the touch page loaded without console errors (a fresh tab shows none), the header read "Serveur : suivi connecté", "Contrôleur : aucun sélectionné" and "État : données indisponibles" with the notice "Choisissez le contrôleur dans Fichiers.", the dashboard showed "Indisponible" for the controller and dashes for X/Y/Z, and the Files view listed `carre-test.nc` (1 Ko, selected, "État chargé indisponible"). After Ctrl+C on the server the same page switched to "Serveur : suivi indisponible" on its own.

Ctrl+C in the terminal running `yarn start-server-dev`, with one browser event stream still open, returned the shell to its prompt at once and left nothing listening on port 8000. A separate check (`require` the compiled touch service, `touch.start()`, no server) exited on its own, confirming that the `unref()`ed heartbeat does not keep the process alive. `touch.stop()` is still never called by `src/server/index.js`, like `cncengine.stop()` and `monitor.stop()`: CNCjs has no graceful-shutdown path, Node's default SIGINT handling ends the process.

Note the development bypass: with `NODE_ENV=development` the express-jwt error handler in `src/server/app.js` lets a request without a token through, so the `401` above comes from the explicit `req.user` check in `api.touch.js`. A production build would answer `403 Forbidden Access` before reaching the handler; that path was not run here because `dist/cncjs` is not built on this machine.

First attempt, before the asset ordering change: the ~60 scripts of the page, loaded in one burst over six keep-alive connections with the same session cookie, made `session-file-store` fail with `EPERM: operation not permitted, rename '….cncjs-sessions\<sid>.json.<tmp>'` (write-file-atomic renaming over a session file another request still had open), which express-session turned into a 500 after the response had been sent, which in turn made Express destroy the socket, so 6 to 8 scripts per load arrived truncated (`ERR_INCOMPLETE_CHUNKED_ENCODING`) and the page stopped at "Chargement incomplet". The same error already appeared once during the main CNCjs app's own i18n burst. Serving static assets before the session middleware removed it (0 errors over several loads); the race is Windows-specific (Linux allows the rename) and was not reproduced with `curl`, which does not share one session file between concurrent requests.

## Not yet validated

- Physical CNC movement, cutting/laser behavior, offsets and homing.
- Real start/pause/resume/stop timing, controller errors, reconnects and emergencies during an actual job.
- Real probing cycles, calibration, contact bounce and tool/fixture geometry.
- The integrated server with a controller attached, a production build (`dist/cncjs`, `NODE_ENV` unset, hashed asset route), a non-root `settings.route`, Linux/Raspberry Pi, other browsers than Chromium and other controller families. Only the no-controller paths above were exercised, in development mode on Windows.
- Long-running operation, Wi-Fi interruptions, memory pressure and screen wake behavior on the target touchscreen.

Keep initial evaluation in the mock demo. Any later hardware validation needs an operator who knows the machine and can verify each action independently.
