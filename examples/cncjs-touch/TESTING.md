# Validation scope

## Reproduce the offline checks

From this directory, run:

```sh
node verify-project.cjs
```

Node.js 18 or newer is required. No external packages, running CNCjs server or CNC controller are required. The suite consists of 56 browser-side test scripts plus script syntax and HTML resource checks, for 58 checks in this source package. The runner uses an explicit list and does not launch the visual fixture or hardware checks.

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

## Progress trail, overrides and macros (2026-10-16)

Added without a controller, so covered by mocks only: `test-preview.cjs` and `test-preview-worker.cjs` check that the preview carries about a thousand trail samples starting at the origin, that the sent-line count matches the file, that `trailCount` picks the samples below the acknowledged line, and that the trail survives the worker transfer; `test-dashboard.cjs` checks the override block (hidden for snapshots without the field, dashes for non-finite values, reason text when refused); `test-job-dialog.cjs` runs a macro through the ticket dialog (one `macro` call, refused when `canMacro` is false) and an override through the command path; `test-macros.cjs` covers the macro sheet (gating, no redundant DOM writes, sheet closed before the dialog, script order); `test-simulation.cjs` exercises the simulated overrides and macros. On the server, `job-service.test.js` checks override validation and refusal outside a job, and the macro ticket flow ending in `macro:run`. Whether Grbl reacts as expected to the override commands, and how the acknowledged-line trail relates to the real tool position, is not established.

## System tab (2026-10-16)

`system-stats.test.js` (Jest) checks per-core usage from `os.cpus()` deltas, the shared sample within 500 ms, `MemAvailable` over `MemFree`, millidegree sensors, skipped or unreadable zones, battery and mains state, and a server without sysfs (Windows/macOS). `api.touch.test.js` covers the session check, `Cache-Control: no-store` and hidden error details for `GET /api/touch-system`. `test-system-monitor.cjs` checks that the page polls only while the tab is shown on a visible page, never with two requests in flight, renders one bar per core, writes nothing for an unchanged sample, backs off on failures (4, 8, 16 then 30 s), recovers, and never shows NaN for malformed data.

## Network, history, tablet actions and clock (2026-10-16)

`system-stats.test.js` adds the `iw` parser (missing fields stay null), background Wi-Fi reads at most every 10 s with a 1.5 s timeout, no child process without a wireless interface or without `iw`, a 120-point history with copies per response, and the history timer's start/stop. `test-system-monitor.cjs` checks the network tile and the sparkline points. `test-tablet-actions.cjs` checks that only titles of enabled commands are shown, the two-tap confirmation and its expiry, refusal during a running or paused job, error messages, and the version and update check, including that the CNCjs token is never sent to GitHub. `test-header-clock.cjs` checks minute-aligned updates, no redundant writes, the off switch and hidden pages. `test-display-settings.cjs` covers the stored clock preference.

## Screen brightness (2026-10-16)

`backlight.test.js` (Jest) checks the percentage reading, a computer without a backlight, a read-only file (409, nothing written), the 5 % floor and the 100 % ceiling, rejection of non-numbers, saving only the last level of a burst 2 s later on an unref'd timer, and restoring the stored level at start (not without a stored number or without rights). `api.touch.test.js` covers both routes. `test-backlight.cjs` checks reads only while the settings screen is shown, one request at a time with the last slider position winning, the ±10 steps and the floor, and the read-only, missing-panel, 404 and no-session messages. For the screen saver, `backlight.test.js` checks that a temporary level may go to 0, is never saved and does not replace the operator level, that wake restores that level only after a dim, and that a panel found dark at start is not taken as the operator level. `test-backlight.cjs` checks the off/minimum/unchanged choice, that a wake waits for the dim answer, and the wake request sent once at page load. `test-screen-saver.cjs` checks one announcement per change, with the wake on the first touch before release.

## Readable settings (2026-10-16)

`test-viewport-scroll.cjs` checks that a `data-fit="scroll"` screen is never scaled or hidden for a measurement, that nothing is remembered and content changes are not observed, that the scroll position survives a refit but resets when the screen is reopened, and that the next screen is fitted again with `main` no longer scrolling.

## Commissioning assistant (2026-10-17)

`job-service.test.js` (Jest) checks that `$X` is accepted only in alarm and `$H` only with `$22=1` from Idle or Alarm, that both and the spindle test (`M3 S` at `$31`, or `$30`/4 when `$31` is 0) need a ticket for the same operation and are checked again at run time, that none runs during a job or with CNCjs automations, `M5` and the `$$` re-read from Idle only, and the full settings list on request. The snapshot reports the triggered X/Y/Z/P inputs (`Pn` absent means none, an old report means unknown). `test-commissioning.cjs` checks the step model (an alarm already present is not taken for the E-stop, a reset counts, each limit must be seen free then triggered, probe contact then release, homing Home → Idle, a silent cycle followed by an alarm is a failure, spindle seen turning then stopped, air-cut file finished), the automatic opening on the first real controller only (not on a simulator port, not twice), resume on the saved step, `M5` when leaving the spindle step, skipping only after the responsibility box, and the saved summary. `test-job-dialog.cjs` checks that the three commands use the confirmation dialog and its nonce, and that a state change closes it.

Run on the tablet against the Grbl simulator through CNCjs (homing temporarily enabled with `$22=1`, restored afterwards):

- Backup: 34 settings read; the `$$` re-read accepted while Idle.
- E-stop step: a soft reset of the board (what an E-stop wired to reset does) was detected, then back to Idle.
- Limit and probe indicators: "au repos" / "libre" read from the reports.
- `$X` from alarm through the confirmation: back to Idle.
- `$H` through the confirmation: the simulator has no switches and answered `ALARM:9` (homing fail); it does not answer `?` during the cycle. The first version waited for a `Home` report and never showed the failure; the assistant now learns when `$H` was accepted and treats an alarm after it as a failure ("Échec … contact non trouvé ?"), with Next blocked.
- Spindle: "Démarrer à 6000 tr/min" → `M3 S6000`, "6000 tr/min demandés", stop → `M5`, "Broche arrêtée", "environ 100 Hz" expected at the VFD.
- Air-cut file added to the library with its preview, selected, loaded and run through the normal start confirmation: `Run` with the spindle at 6000, then `Idle`; the step ticked itself ("Programme d’essai terminé").
- Summary saved; Réglages shows "Faite le 17/10/2026 04:25:39".

The physical E-stop, the limit switches, the probe and a real homing cycle can only be checked on the machine.

## Grbl simulator run (2026-10-16/17)

Setup: the Surface RT running the integrated server (PM2 `cncjs-next`), the official Grbl 1.1h firmware built with grbl-sim and the patches in [grbl-sim/](grbl-sim/README.md), exposed as `/home/pi/ttyGRBL-sim` and opened by CNCjs as a Grbl controller (115200, `$5=1`, `$6=1`). The touch interface was driven from a browser at 1366 × 768 against the same server. Test file: 18 lines, a 40 mm square and a 10 mm radius circle at 400 mm/min, `M3 S1000`, uploaded through the touch library so it has a preview and a trail. No machine, no motors.

What worked as designed: controller selection, load, start with its confirmation, fresh status reports about every 250 ms during the whole program, feed override +10 % (Grbl reported `Ov:110`) and back to 100 %, pause (Grbl `Hold`, position unchanged), resume through its confirmation, the tool marker following the square and the circle, the trail ahead of the tool by the acknowledged lines, a CNCjs macro run from the Macros sheet through its confirmation (Z +5 mm), the alarm shown in the header and on the menu.

Defects found and fixed (server side, with Jest tests):

1. **A controller destroyed by CNCjs broke every later snapshot.** When the port disappears (a USB cable pulled, the board reset), CNCjs sets `runner` and `sender` to `null`; the job service, the probe-input observer and the motion preflight then threw while removing their listeners, kept the dead record, and `GET /api/touch-job` answered 500 until CNCjs was restarted. The records are now forgotten first and listeners removed only from objects that still exist. The touch API also logs such failures (the client still gets a generic message).
2. **A pause near the end of a program could not be resumed from the touch screen.** CNCjs appends `%wait` to every loaded program and holds its sender with that reason; a pause made then kept the `%wait` reason, and the resume rule refused any hold with a reason. Only a program-requested pause (`M0`, `M1`, `M6`, or another reason) now needs the operator in CNCjs.
3. **The work offset became unknown during every program**, which hid the tool marker: CNCjs stops asking `$G` while streaming. The offset seen at start is kept while the job runs or is paused, but only when the loaded program contains no `G54`–`G59.x`, `G10` or `G92`.
4. **A finished program looked stopped** ("Travail arrêté", 0 %): CNCjs rewinds the line counters when a program ends. The server now remembers CNCjs's sender `end` event (cleared by an operator stop or a new load) and the dashboard shows "Terminé — programme exécuté jusqu’au bout", 100 % and the whole trail.
5. **The trail vanished whenever the tool position could not be drawn** (stale report, unknown offset). It only depends on acknowledged lines and the preview, and is now drawn on its own (browser side).

Observed, not changed:

- **Forced stop ends in an alarm.** "Arrêter le travail" runs CNCjs's forced stop: feed hold, then 500 ms later a soft reset if Grbl reports `Hold`. With the simulator's 10 mm/s² acceleration the axes are still decelerating at that moment, so Grbl raises ALARM 3 (reset while in motion) and the position must be re-established. A machine with similar settings will do the same; the alarm is shown, but the touch interface has no unlock (`$X`) or homing command yet.
- **CNCjs never reads the Grbl settings if it connects while Grbl is not idle.** It sends `$$` on the first status report; Grbl answers `error:8` outside Idle/Alarm and CNCjs does not retry, so `$13` (report units) stays unknown until the next connection and the tool marker stays hidden with its reason. Sending `$$` from the touch service would fix it but means the interface writing to the controller on its own; left for review.
- After `pm2 restart` the touch page once showed "Chargement incomplet" on a browser over Wi-Fi while the tablet was busy; "Réessayer" loaded normally. Not reproduced.

Simulator limits: approximate real time, no physics (inertia, missed steps, real switches or probe contact). These results do not replace the supervised machine tests in HANDOFF.md.

## Spindle run on the simulator (2026-10-17)

Target machine: a LUNYEE 4040 Nova (Grbl_ESP32 1.3a, 400 × 400 × 130 mm, 1204 ball screws, NEMA 23, 5000 mm/min) with a G-Penny 1.5 kW 65 mm spindle on a VFD, driven by the controller's PWM through a PWM to 0–10 V module plus a run relay. The simulator (Grbl 1.1h, same protocol) was given an estimated profile: `$100–$102=400` (1/8 microstep assumed), `$110/$111=5000`, `$112=1500`, `$120/$121=400`, `$122=200`, `$130–$132=400/400/130`, `$30=24000`, `$31=6000`, `$32=0`. Steps per mm, accelerations and the minimum spindle speed are guesses to replace with the machine's own `$$`. A 100 mm move at 5000 mm/min took 1.58 s (about 1.4 s expected).

Test program: `M3 S12000`, `G4 P2`, a 120 mm square, `M5`. Results through CNCjs and the touch screen:

- The follow-up screen shows the real values from Grbl: "Avance réelle 300 mm/min · Broche 12 000 tr/min".
- Spindle override +10 %: Grbl reported `Ov:100,100,110` and 13 200 rpm.
- Pause: the axes stopped (feed 0) and the spindle kept turning at 13 200 rpm, as Grbl does on a feed hold; the new warning appeared ("les axes sont arrêtés mais la broche tourne toujours").
- Resume through its confirmation: running again at 13 200 rpm.
- Stop: `Run` then `Idle`, spindle 0, no alarm. With these accelerations the axes are still before CNCjs's soft reset; the ALARM 3 seen earlier came from the simulator's slow default settings.
- The program ran to the end with "Terminé", 100 % and the whole trail.

Two defects found and fixed: the preview rejected `G4` (dwell), so any program with a spin-up pause after `M3` had no preview or trail; and the library list did not show a file just uploaded, because CNCjs's watch list sees a new file about 4 s after it is written (measured). The preview now accepts `G4 P…` without motion (a `P` word elsewhere, or `G4` with axis words, is still refused), and the list is refreshed again 2, 5 and 9 s after an upload.

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

## On-device measurements (2026-10-16, Surface RT)

Device: Surface RT, Tegra 3 (4 × ARMv7, no cpufreq), 2 GB, Raspbian 11 armhf, mainline kernel 5.17, Xorg with the `opentegra` driver (2D acceleration only: stock Mesa has no 3D for Tegra 3, so Chromium 106 runs with `--disable-gpu`, software rasterization and compositing). Scenario: the real interface (`index.html?perf=1`), three rounds of Menu → Fichiers → Suivi → Préparer → Fichiers driven by `xdotool`, about 60 s, report exported from the badge.

| Measure | Before (first deployment) | After (remembered scales) |
| --- | --- | --- |
| Frame gap median / p95 | 16.7 / 16.7 ms | 16.7 / 16.7 ms |
| Frame gap p99 / max | 83–150 / 367–467 ms | 100 / 217 ms |
| Frames over 50 ms | 42–49 | 40 |
| Long tasks: count / total / max | 31–35 / 3.6–4.4 s / 287–380 ms | 22 / 2.5 s / 181 ms |
| Hidden screen measurements | 4–6 | 0 |

Steady state was already at 60 frames per second; the gains are in the screen transitions (long tasks −30 to −45 %, worst frame about halved) and the first opening of a screen no longer measures it hidden. Chromium flags were compared on the device (`--enable-low-end-device-mode` on/off, 3 or 4 raster threads, `--disable-lcd-text`): all within noise of a single run, so the kiosk flags were left unchanged. `--enable-low-end-device-mode` makes Chromium report 0.5 GB of device memory on this 2 GB tablet.

### Where the remaining time goes (Chromium trace on the device)

A 48 s `--trace-startup` recording of the same scripted navigation, renderer main thread: Layout ≈ 1.5 s (39 ×, up to 200–260 ms), style recalculation ≈ 1.0 s (100 ×, up to 120 ms), paint ≈ 0.4 s (max 30 ms), JavaScript ≈ 1.2 s. The 200 ms tasks are the full style and layout of a screen when it is shown: with software rendering on this CPU that is the cost of one dense screen, not of the scripts. A sampled V8 profile puts most of the script time in `shared-library.js` (building the file rows, the request path that re-parses the stored CNCjs session on every call) and in `viewport-fit.js`.

Tried on the device with two traces per variant and **rejected** (no gain or worse): inactive screens kept with `content-visibility: hidden` instead of `display: none` (Layout +18 %, worst layout 335 ms instead of ~200); `contain: layout paint` on every card (within noise). Intl formatting is not a hot spot here: `toLocaleString` costs 0.14 ms per call on the tablet, 1–2 ms with options.

The DOM is small (45–87 elements per screen, 939 in the page, 668 CSS rules): the cost is per element on this CPU, not DOM bloat.

**Kept: idle-time warm-up of unseen screens** (`viewport-fit.js`). The first opening of a screen costs two to three times a later one (Chromium's text shaping and style caches are cold, and early on it competes with start-up work). 1.5 s after the first fit, each screen not yet shown is laid out once during idle time, hidden and out of flow, then restored; nothing is painted. Device A/B (two traces each, first click 19 s after launch): first opening of Fichiers 110/104 ms layout + 71/86 ms style without, **53/43 ms + 54/51 ms with** — about 80 ms (−45 %) off the first opening of every screen; later openings unchanged; the warm-up itself is ~0.7 s of layout spread over idle callbacks right after the menu appears.

Beyond that, further reductions would have to come from lighter screens (fewer boxes and text runs per screen), not from browser or CSS switches.

### Preview regeneration on the device (2026-10-16)

The parser speed-up (commit `de975611`, `library-preview.js` + `library-preview-worker.js`) had only been measured on the PC and in Node. Measured here on the Surface RT itself, with the two files of the watched folder, through the real "Fichiers → Détails de l’aperçu → Régénérer l’aperçu depuis ce PC" flow.

Method. Same device, Chromium 106 and kiosk flags as above. The kiosk was frozen (`kill -STOP` on its processes, 11:24–11:49) and a second Chromium was started with a fresh profile (`--user-data-dir=/tmp/cr-regen-*`, Local Storage copied from the kiosk, `--remote-debugging-port=9222`) on `index.html?perf=1`. The page was driven over the DevTools protocol from the tablet itself (Node 12 plus the `ws` module of the CNCjs install): DOM `click()` on the file row, on "Détails de l’aperçu" and on `#library-regenerate`, then `#library-regenerate-status` polled every 100 ms until "✓ Aperçu mis à jour". During each regeneration a `requestAnimationFrame` loop recorded the frame gaps of the UI thread and a `PerformanceObserver` the long tasks; the phase times come from `previewRenders[].phaseStartMs` of the harness (`analyse` = first "Analyse du parcours" message, `dessin` = first "Dessin du parcours", `encodage` = "Encodage de l’image PNG"). "Old parser" is the deployment backup `touch-20261016-094419` (the two preview files of commit `daa0350d`, md5 `40be09dc` / `6f75eb8a`), served temporarily by copying them into the touch folder; "new parser" is the current branch. One regeneration per file with the old parser, two with the new one (the second run of the 7.9 MB file with the new parser completed in about 80 s according to the sidecar write time, but its report was lost to a DevTools timeout and is not counted).

| File (response size, segments) | Parser | End to end | `renderResponse` | Analyse (two passes, worker) | Dessin (UI thread) | Encodage |
| --- | --- | --- | --- | --- | --- | --- |
| Ebauche 233 KB (263 KB JSON, 15 405 segments) | old | 16.2 s | 14.4 s | 5.5 s | 7.8 s | 0.7 s |
| Ebauche 233 KB | **new** | 8.5 / 8.3 s | 7.2 / 7.1 s | 1.8 / 1.9 s | 4.7 / 4.5 s | 0.5 / 0.5 s |
| Finition 7.9 MB (8.9 MB JSON, 309 982 segments) | old | 222.1 s | 207.5 s | 69.6 s | 136.3 s | 0.5 s |
| Finition 7.9 MB | **new** | 76.1 s | 63.0 s | 11.2 s | 50.6 s | 0.4 s |

The time between "end to end" and `renderResponse` is the server round trip before the worker starts (both `POST file` requests and the download of the JSON envelope): about 1 s for the small file and 13–14.5 s for the 7.9 MB one, on the Node process of the same CPU. It is unchanged by the parser.

Fluidity of the interface while the preview is computed (sheet open, status text updating):

| Run | Frames | Gap median / p95 / p99 / max | Gaps over 50 / 100 / 250 ms | Long tasks: count / total / max |
| --- | --- | --- | --- | --- |
| 233 KB, old | 885 | 16.7 / 16.7 / 66.7 / 300 ms | 9 / 2 / 1 | 6 / 459 ms / 107 ms |
| 233 KB, new (two runs) | 472, 451 | 16.7 / 16.7–33.3 / 50 / 200 ms | 4, 3 / 1, 1 / 0, 0 | 3, 2 / 188, 127 ms / 75 ms |
| 7.9 MB, old | 13 199 | 16.7 / 16.7 / 16.7 / 200 ms | 10 / 3 / 0 | 5 / 314 ms / 84 ms |
| 7.9 MB, new | 4 516 | 16.7 / 16.7 / 16.7 / 200 ms | 5 / 2 / 0 | 2 / 102 ms / 51 ms |

Findings:

- On this CPU the parsing passes are 3× faster on the small file and 6× faster on the large one (69.6 s → 11.2 s). The drawing phase is also 1.7× to 2.7× shorter, although the drawing code did not change: the old worker paused after every geometry block until the UI thread acknowledged it, so drawing and parsing alternated; with three blocks in flight the UI thread now draws without waiting. End to end, regenerating the 7.9 MB preview on the tablet goes from 3 min 42 s to 1 min 16 s.
- The interface stayed fluid in every run: median and p95 frame gaps at 16.7 ms (60 frames per second) during the whole computation, long tasks of at most 107 ms. The few 200–300 ms gaps are at the very start (opening the sheet and issuing the requests) and at the very end (writing the sidecar and refreshing the list), not during parsing or drawing. The JS heap stayed between 6 and 10 MB.
- What remains is the drawing phase: 309 982 segments at about 0.16 ms each (one `beginPath`/`stroke` per segment on a software-rendered 2D canvas), 50 s of the 76 s, plus the 13 s server round trip for the 8.9 MB envelope. Those are the next targets if regeneration on the device needs to be faster; the parser is no longer the bottleneck.
- Caveat: the old-parser runs were done once each, and the kiosk was frozen during the whole session, so the numbers describe an otherwise idle tablet. After the comparison the optimised version was redeployed (`deploy-touch.sh`, backup `touch-20261016-114947`) and verified (`function tokenize` served); the two sidecar files were last rewritten by the old parser, which produces the same segments, bounds and image pipeline.

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
- The integrated server with a controller attached, a non-root `settings.route`, other browsers than Chromium and other controller families. The production build (`dist/cncjs`) has since been run on the Surface RT (Raspbian 11 armhf, Node 18, PM2 `cncjs-next`, kiosk connected to the integrated event stream) — still without a controller.
- Long-running operation, Wi-Fi interruptions, memory pressure and screen wake behavior on the target touchscreen.
- Feed/spindle overrides and `macro:run` against a real Grbl controller, and the accuracy of the acknowledged-line progress trail against the actual tool position.

Keep initial evaluation in the mock demo. Any later hardware validation needs an operator who knows the machine and can verify each action independently.
