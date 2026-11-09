# R6 browser evidence — execution checkpoint

R6 is **in progress**. The authoritative task state is [STATUS](../../../STATUS.md). These artifacts include failed attempts as well as accepted results; a screenshot or an older file named `final` does not establish a passed gate.

Source checkpoint: branch `feat/tonic-ui-v2-migration`, HEAD `ae070b9f`, with uncommitted R6 fixes. Historical Visualizer comparator: `0a90e31f90515d711379bad8729f96a068d90718`, before engine extraction. Node 24.21.0, Yarn 3.3.1, macOS, socat 1.8.1.3. Browser runs are headless, DPR 1, at 1440×900 or 768×900. Initial runs use Playwright 1.62.1 / Chromium 151.0.7922.34; later functional runs use Playwright 1.63.0 / Chromium 153.0.8010.12. Do not compare timing samples across these browser versions.

The later functional run identifies the unmasked renderer as `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (LLVM 10.0.0) (0x0000C0DE)), SwiftShader driver)`. Older artifacts containing only `WebKit WebGL` do not establish the exact renderer identity.

## Fixtures and owned runtime

Run commands from the repository root. The generator replaces only its generated fixture directories; use an isolated temporary path, with no real configuration or G-code. Existing runners currently refer to `/tmp/cncjs-r6-20261001`; adapt those fixture paths together when choosing another directory.

```sh
R6_ARTIFACTS="$PWD/docs/superpowers/plans/2026-09-07-tonic-ui-v2/artifacts/browser/r6-20261001-luna"
R6_TMP=/tmp/cncjs-r6-20261001
python3 "$R6_ARTIFACTS/generate-fixtures.py" "$R6_TMP"
cp -R "$R6_TMP/watch-siblings" "$R6_TMP/watch-tree/r6-sibling-batch"
CONFIG_PATH="$R6_TMP/config.cncrc" SUPPRESS_WEBGL_WARNING=1 yarn dev > "$R6_TMP/lifecycle-r6-restart.log" 2>&1
```

Create both watch fixtures **before** starting the lifecycle: the watcher caches root entries at startup. The reference config is `docs/testing/configs/browser-test.cncrc`, copied into `/tmp`; it starts with anonymous authentication and the synthetic `/tmp/ttyGRBL` port. `yarn dev` includes development compilation, backend :8000, frontend :8080, simulator, and socat. Do not launch another simulator lifecycle against that tty. Redirected logs prevent simulator output from blocking the process. Local production builds were not run.

The 100,000-line fixture is 2,379,870 bytes, SHA256 `cf7dae8dc539fe56490fb7678a5598503c87888f5b3af1738fc2d2233a9e7a06`. The original watch hierarchy is 100 directories × 49 files = 5,000 nodes. The additional sibling directory has 5,000 files; combined root has 101 directories and 9,900 files. `generate-fixtures.py`, its `/tmp` manifest, and `watch-directory-fixtures-r6.json` document deterministic generation and hashes. Large payloads are not committed.

At the October 2 restart checkpoint, frontend PID 181 listens on :8080 and backend PID 180 listens on :8000 (parent lifecycle PID 152). These are historical observations, not reusable process identifiers: recheck command, parent, and port ownership before stopping any process. Final ownership/cleanup reconciliation remains pending.

## Browser setup and runner commands

The original pinned installation was `/tmp/cncjs-r6-playwright/node_modules/playwright/index.mjs`. To recreate that pair without browser cache garbage collection removing another installed pair:

```sh
npm install --prefix /tmp/cncjs-r6-playwright playwright@1.62.1
PLAYWRIGHT_SKIP_BROWSER_GC=1 PLAYWRIGHT_BROWSERS_PATH=/tmp/cncjs-r6-playwright-browsers /tmp/cncjs-r6-playwright/node_modules/.bin/playwright install chromium
```

Set the same `PLAYWRIGHT_BROWSERS_PATH` when running those scripts. The initial Chromium 151 bundle disappeared after the separate global browser installation; it is not assumed to remain installed.

Later runner commands use the user's global Playwright 1.63.0:

```sh
PLAYWRIGHT_MODULE="$(npm root -g)/playwright/index.mjs"
R6_STORAGE_STATE=/tmp/cncjs-r6-20261001/auth-state-current.json
PLAYWRIGHT_MODULE="$PLAYWRIGHT_MODULE" R6_STORAGE_STATE="$R6_STORAGE_STATE" node "$R6_ARTIFACTS/visualizer-functional-r6.mjs"
PLAYWRIGHT_MODULE="$PLAYWRIGHT_MODULE" R6_STORAGE_STATE="$R6_STORAGE_STATE" node "$R6_ARTIFACTS/watch-directory-r6.mjs"
PLAYWRIGHT_MODULE="$PLAYWRIGHT_MODULE" R6_STORAGE_STATE="$R6_STORAGE_STATE" node "$R6_ARTIFACTS/webgl-fallback-r6.mjs"
```

Run simulator-dependent browser sessions sequentially. Authentication state is temporary and origin-specific; never commit it. After lifecycle/auth changes, refresh it through actual sign-in rather than reusing stale state. A fresh anonymous configuration does not require it. Successful sign-in/sign-out/sign-in and final synthetic-user cleanup are still being reconciled into durable evidence.

Earlier runners use a literal pinned Playwright import and anonymous startup. Their successful entry commands were:

```sh
node "$R6_ARTIFACTS/workspace-gates.mjs"
node "$R6_ARTIFACTS/simulator-flow.mjs"
node "$R6_ARTIFACTS/jog-release.mjs"
node "$R6_ARTIFACTS/admin-machines.mjs"
R6_STORAGE_STATE="$R6_STORAGE_STATE" node "$R6_ARTIFACTS/admin-resource-crud-r6.mjs"
node "$R6_ARTIFACTS/route-cycles-r6.mjs"
R6_RESULT_PATH="$R6_ARTIFACTS/visualizer-100k-r6.json" node "$R6_ARTIFACTS/visualizer-100k-r6.mjs"
```

These scripts write results beside their source. Preserve accepted results before rerunning; the historical results describe the source/browser/auth state of their execution, not an assertion that every entry command works against the latest authenticated lifecycle without adaptation. Permission-restricted environments require an approved local process/browser invocation to bind loopback ports and start Chromium.

## Historical frontend reproduction

Archive the comparator into an isolated directory; do not reset the working tree or share its dependencies with current source. Apply the preserved instrumentation patch there, install the archived dependency graph with its Yarn release, and copy development static assets:

```sh
R6_BASELINE=/tmp/cncjs-r6-baseline-src
mkdir -p "$R6_BASELINE"
git archive 0a90e31f90515d711379bad8729f96a068d90718 | tar -x -C "$R6_BASELINE"
patch -d "$R6_BASELINE" -p1 < "$R6_ARTIFACTS/baseline-instrumentation.patch"
```

From that isolated directory:

```sh
YARN_ENABLE_SCRIPTS=false YARN_GLOBAL_FOLDER=/tmp/cncjs-r6-baseline-yarn-global YARN_CACHE_FOLDER=/tmp/cncjs-r6-baseline-yarn-cache node .yarn/releases/yarn-3.3.1.cjs install --immutable
mkdir -p output/cncjs/app
cp -R src/app/i18n src/app/images src/app/assets src/app/favicon.ico output/cncjs/app/
NODE_ENV=development node_modules/.bin/webpack serve --progress --config webpack.config.development.js --port 8082 > /tmp/cncjs-r6-baseline-frontend.log 2>&1
```

The baseline frontend shares the isolated backend :8000. The archived `webpack.config.development.env` sets `PROXY_TARGET=http://localhost:8000`, `WEBPACK_DEV_SERVER_HOST=0.0.0.0`, and an empty public path. The original baseline process was webpack PID 96116 on :8082; its original log location was not recorded. Authentication for :8082 must be established independently because :8080 storage does not automatically apply to it.

```sh
PLAYWRIGHT_MODULE="$PLAYWRIGHT_MODULE" R6_BASE_URL=http://127.0.0.1:8082 R6_RESULT_PATH="$R6_ARTIFACTS/baseline-visualizer-100k.json" node "$R6_ARTIFACTS/baseline-visualizer-100k.mjs"
```

The patch records parse/load start after the existing unload and ends at completion of the first visible `renderer.render`, matching the current engine interval. Both runners capture native input timestamps, not host-side polling latency. The initial comparison has different drawing areas (648×284 historical, 648×755 current), so it remains an open reviewer gate. The matched-browser/drawing-area rerun below supersedes this initial performance comparison.

## Matched comparator runner

`matched-performance-r6.mjs` is one shared baseline/current runner. Both modes completed on Chromium 153 with the same SwiftShader, 648×284 drawing area, 100k fixture and resolved light appearance. It fixes both drawing areas to 648×284, asserts CSS/drawing dimensions and the unmasked renderer, warms five loads, then measures five loads and 150 native actions. PerformanceObserver records long tasks by phase. The current mode additionally repeats five resource warmups and 20 cycles with checkpoints at 5/10/20. `R6_SKIP_RESOURCES=1` skips this extension.

```bash
PLAYWRIGHT_MODULE="$(npm root -g)/playwright/index.mjs" R6_STORAGE_STATE=/tmp/cncjs-r6-20261001/auth-state-current.json R6_PERF_MODE=baseline node docs/superpowers/plans/2026-09-07-tonic-ui-v2/artifacts/browser/r6-20261001-luna/matched-performance-r6.mjs
PLAYWRIGHT_MODULE="$(npm root -g)/playwright/index.mjs" R6_STORAGE_STATE=/tmp/cncjs-r6-20261001/auth-state-current.json R6_PERF_MODE=current node docs/superpowers/plans/2026-09-07-tonic-ui-v2/artifacts/browser/r6-20261001-luna/matched-performance-r6.mjs
```

Commands run sequentially against the already owned baseline/frontend/simulator lifecycle. Storage origins adapt only between the local 8080/8082 test frontends; credentials are not persisted in evidence. Record and compare the resulting browser/renderer/fixture/canvas assertions before accepting timings. A median regression above 20% or new long main-thread stalls remains a reviewer gate.

## Accepted evidence and remaining gates

| Evidence | Result / scope |
| --- | --- |
| `workspace-gates.json` | 9 cases: themes, both viewports, contrast, overflow, focus, tabs, collapse, Console fullscreen; closes deferred P3 |
| `simulator-flow.json`, `jog-release.json` | 12 workflow and 9 jog checks against the synthetic Grbl simulator |
| `admin-machines.json`, `admin-resource-crud-r6.json` | Machine profile CRUD and Commands/Events/Macros CRUD |
| `visualizer-functional-r6-verified10.json` | 14 checks: six pivots, actual camera/projection/zoom, units, scene visibility, native probe drag; visual actions emit zero unexpected commands |
| `profile-loaded-visibility-sequence-r6.json` | Five focused checks: loaded profile switch preserves pivot/world center, trusted Hide/Show Limits changes state and scene, zero mutation delta, unload and profile cleanup. Earlier broad-run visibility failures not reproduced; exact historical cause unproven |
| `webgl-fallback-r6-complete.json` | Actual context-null fallback; G-code load settles with Run/Close enabled and no Loading/Rendering; unload clears state; exact expected commands |
| `watch-directory-r6-complete8.json` | Nested hierarchy and 5,000 siblings; native wheel reaches/selects last file, Load shows its relative path, then unload cleanup |
| `visualizer-100k-resource-20cycles.json` | Original 20-cycle plateau: 251 geometries / 55 textures / 6 owned listeners / 0 RAF / 1 canvas; post-fix recheck is in matched current evidence |
| `matched-performance-comparison-r6.json` | Matched pair: load-to-first-render median +10.45%, renderer-call median unchanged, input-to-render median +2.53%; no new long-stall class. Current post-fix resource checkpoints stable at 251 geometries / 188 textures / 6 listeners / 0 RAF / 1 canvas |
| `route-cycles-r6.json` | 20 actual teardown/remount cycles, zero growth in connected EventTarget listeners |
| `visualizer-admin-workspace-size-passed-r6.json` | Actual route entry fixes the preserved 1×0 canvas regression |
| `workspace-console-webcam-r6.json` | Three cases: live source Save/Cancel/restore, native scale/rotation/fullscreen, 45 read-only Console queries with clipboard/scroll/clear/fullscreen verification |
| `workspace-widget-lifecycle-r6.json`, `workspace-widget-lifecycle-r6-settings-fork-pass-reorder-fail.json` | Native reorder/restoration and separately passed Custom settings/fork/remove/cleanup; the earlier reorder failure is retained |
| `workspace-widget-views-r6-aggregate.json` | 13 generic widgets collapse/expand/fullscreen; all 16 frame regions present; controller view operations complemented by the replay evidence below |
| `workspace-widget-theme-settled-1440.json`, `workspace-widget-theme-settled-768.json` | Four settled theme states and native camera actions at both viewports; contrast 15.91:1 light / 6.48:1 dark |
| `other-controller-replay-r6.json` | Marlin/Smoothie/TinyG bodies and state/settings modal fixture IDs through incoming Socket.IO polling; actual Grbl open/state preserved, zero outgoing commands/errors |
| `macro-live-browser-r6.json` | Create/Update native keyboard variable insertion, zero nested buttons, record deletion; source tests also cover Space |
| `auth-signin-signout-cleanup-r6.json` | Five UI checks: sign-in/out/in/out and isolated admin deletion; record absent, credential values omitted, zero page/request errors |
| `console-classification-r6.json` | All accepted latest runs have zero unclassified patterns; Tooltip warning reproduced with equivalent baseline Create action; existing warnings and maintenance follow-ups retained |
| `admin-resources-auth-r6.json` (accepted User gate only) | Native Create/Update User read-back passes; other failed gates in this historical batch are superseded by later CRUD/auth artifacts |
| `integrated-validation-20261002.json` | Latest source checks: 78 frontend suites / 501 tests, lint 0 errors / 4 existing warnings, guard 361 files / 18 domain classes / 0 violations |

The Node gate passes 20 suites / 635 tests with the user-directed SocketConnection exclusion and `--detectOpenHandles --forceExit`. It reports 112 inherited simulator intervals; this is not evidence of clean Node shutdown. Connected listener counts and heap/WeakRef observations likewise do not prove a leak-free heap.

`visualizer-interaction-150-pan-r6.json` was curated from 12,586,652 to 188,988 bytes by replacing repeated synthetic G-code content with byte counts and SHA256. All 150 latency samples, 17 pan samples, five loads, resource snapshots, and command-event ordering remain. Its historical command monitor captured payloads rather than command names, so those entries establish event counts only; exact command classification comes from the later functional runner. Curation metadata records the original artifact SHA256 and transformation.

R6 completed after final artifact/diff/locale review and owned-process cleanup. No R6 commit/push or W3 production/CI gate is claimed.

Matched perf limitations: load p95 increases25.7% with only five loads; both runs show software-WebGL pan/readback longtasks (baseline375/max153ms, current355/max163ms). The historical `uploadToRunEnabledMs` includes metric/locator work and is not an isolated readiness measurement. Texture uploads rise after visiting camera angles and plateau at188; TextSprite label creation plus Three sprite frustum-culling/lazy upload explain the higher cache as an inference. Detailed conditions/sample integrity are in the comparison JSON.

Final cleanup: `r6-final-cleanup.json` records users/machines/commands/events/macros all0, all verified R6 PIDs exited, ports8000/8080/8082 closed and no simulator link. All17locale files preserve HEAD values plus nine required Machines keys. Auto-review rejected broad deletion of /tmp config/log/evidence files; those diagnostic files remain and deletion was not retried. Authentication must be recreated for a future reproduction, since the synthetic account was deleted.

Follow-up cleanup (2026-10-02): the user explicitly authorized removal of R6 temporary files. The isolated /tmp config/auth/log/fixture directory, baseline checkout, temporary Playwright package/browser cache, reviewed R6 logs and HTTP probe HTML files were deleted. Repository evidence remains; referenced /tmp logs are historical paths and are no longer available. Reproduction requires recreating the documented lifecycle and fixtures.
