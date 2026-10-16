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

## Not yet validated

- Physical CNC movement, cutting/laser behavior, offsets and homing.
- Real start/pause/resume/stop timing, controller errors, reconnects and emergencies during an actual job.
- Real probing cycles, calibration, contact bounce and tool/fixture geometry.
- Running the integrated server against a real CNCjs installation (routes are registered and unit-tested; no end-to-end run against a live `cncjs` process has been made), supported Node/browser matrix and other controller families.
- Long-running operation, Wi-Fi interruptions, memory pressure and screen wake behavior on the target touchscreen.

Keep initial evaluation in the mock demo. Any later hardware validation needs an operator who knows the machine and can verify each action independently.
