# Validation scope

## Reproduce the offline checks

From this directory, run:

```sh
node verify-project.cjs
```

Node.js 18 or newer is required. No external packages, running CNCjs server or CNC controller are required. The suite consists of 47 browser-side test scripts plus script syntax and HTML resource checks, for 49 checks in this source package. The runner uses an explicit list and does not launch the visual fixture or hardware checks.

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

## Not yet validated

- Physical CNC movement, cutting/laser behavior, offsets and homing.
- Real start/pause/resume/stop timing, controller errors, reconnects and emergencies during an actual job.
- Real probing cycles, calibration, contact bounce and tool/fixture geometry.
- Running the integrated server against a real CNCjs installation (routes are registered and unit-tested; no end-to-end run against a live `cncjs` process has been made), supported Node/browser matrix and other controller families.
- Long-running operation, Wi-Fi interruptions, memory pressure and screen wake behavior on the target touchscreen.

Keep initial evaluation in the mock demo. Any later hardware validation needs an operator who knows the machine and can verify each action independently.
