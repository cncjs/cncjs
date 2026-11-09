# Browser E2E

Run against the existing `yarn dev` application. The runner does not start, stop, or rebuild it.

Browser scenarios live in root `test/e2e/scenarios/`; shared fixtures live in `test/e2e/support/`. These flows cross the application, HTTP and Socket.IO boundaries, so they are not split between `src/app` and `src/server`. Existing colocated unit tests remain unchanged. Generated reports and screenshots stay in `output/e2e/`.

Migration verification: `yarn test:e2e all --list` discovers 298 light/dark tests across 18 spec files, including the Socket.IO/API guard regressions in `socket-safety.spec.mjs`. Screenshot-enabled layout and isolated Grbl preview/execution smoke passed 4/4, with all 17 widget captures per theme and toolpath screenshots under root `output/e2e/screenshots/`. The earlier 9/10 migration smoke exposed a dark Marlin Socket.IO teardown race, now repaired and verified by the 16/16 bootstrap/controller run below. All 22 E2E modules passed Node syntax checks. The complete E2E tree now passes `eslint test/e2e --ext .mjs --max-warnings 0`; sequential browser interaction loops and the PNG decoder's bitwise operations have documented, scoped exceptions rather than altered test behavior.
Final post-I1–I6 verification: the full 18-spec light/dark E2E run passed 298/298 in 40.6 minutes with one worker and no retries. Reports and screenshots were enabled in the isolated source copy; the 17 per-widget captures and full workspace views were reviewed in both themes. No physical controller or camera pass is claimed.

```sh
yarn test:e2e
```

Playwright must have a Chromium browser available. To use an existing Chrome installation without downloading a browser:

```sh
E2E_BROWSER_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" yarn test:e2e
```

Alternatively, prepare the bundled browser with `yarn playwright install chromium`.

## Suites and color modes

Every scenario runs in two projects: `light` and `dark`. Each isolated browser context seeds the corresponding application appearance as well as the browser color scheme. Changing the OS scheme alone is not sufficient to test an explicitly selected application theme.

```sh
yarn test:e2e widgets
yarn test:e2e visualizer
yarn test:e2e navigation
yarn test:e2e administration
yarn test:e2e workspace
yarn test:e2e safety
yarn test:e2e all --project=dark
yarn test:e2e all --grep "simulator:"
yarn test:e2e all --list
```

| Suite | Coverage |
| --- | --- |
| Widgets | Disconnected rendering, local interactions, menus, collapse/fullscreen, fork/remove and mocked Axes Settings save; read-only Marlin/Smoothie/TinyG snapshots and controller tabs. Connected Grbl/G-code flows belong to the Visualizer suite. |
| Visualizer | Camera views, zoom, camera mode, projection/display options that remain open while toggling, 3D toggle and compact G-code dashboard; real simulator connection, G-code preview/run/pause/resume/stop, loaded-toolpath renderer metrics and clear-on-unload, work coordinates, watch directory, Grbl reports and overrides |
| Navigation | Pre-React loading appearance and refresh, saved/system appearance precedence, application menu, language, navigation, About, external entry points; all seven Administration pages; mutation/background fetches versus explicit Refresh table loading |
| Workspace | Panel toggles, widget managers, collapse/expand, local layout persistence and widget lifecycle; responsive card bounds at 1440, 1280, 1024, 800, and 390px; actual WebGL transparency and themed surface |
| Safety | Socket.IO polling and WebSocket packet policies, and the G-code upload identity rule, against private HTTP fixtures without a CNCjs backend |

Administration includes Commands, Events, Macros, Machine Profiles, General Settings, User Accounts, and Workspace Settings. Validated entry/cancel paths do not create, update, or delete server records.

Read-only record fixtures make edit/delete-cancel entry checks deterministic even on an empty server. Those scenarios still exercise the real UI, validation, and cancellation; they do not simulate successful persistence.

Bootstrap scenarios block application bundles to inspect the real initial HTML before React can mask a wrong background. They cover saved appearance overriding the OS, automatic/missing settings, malformed or unavailable storage, refresh, and application handoff.

Table-loading scenarios use isolated, stateful HTTP responses for Commands, Events, User Accounts, and Macros. They hold real query fetches pending to verify retained rows and distinguish background mutation refreshes from explicit Refresh. Expected writes are fulfilled locally; no live records are changed.

Fullscreen scenarios exercise all 12 widgets with enabled fullscreen menus, plus the Console toolbar toggle. They check an opaque frame, header/body boundaries, scrollable content, viewport resizing, disabled collapse, and return to the panel in both color modes. Fullscreen captures are saved under `screenshots/{light,dark}/fullscreen/`. Disconnected controller menus remain disabled; controller snapshot coverage is separate.

Header scenarios cover all six quick-access commands, disconnected-state protection, and reachability at desktop and narrow widths. Connected command checks target only the ephemeral Grbl simulator. Split-dropdown scenarios measure chevron centering for 3D View and Upload G-code. Watch Directory coverage checks opening Browse, disabled loading without selection, and cancellation; Add, Refresh, directory traversal, and file loading are not covered.

Custom Commands menu scenarios mock every execution request and publish isolated task events. They cover enabled filtering, action-name fallback, management navigation, empty state, HTTP failure, running-state protection, success/nonzero exit notifications, completion before the HTTP response, and config-change refresh. No server shell command is executed.

Non-3D dashboard scenarios cover the empty logo/status, 20px progress track, centered in-track line counter, loaded listing, completed progress, and return to 3D. G-code execution targets only the ephemeral Grbl simulator.

Axes scenarios check table insets and action/dropdown icon contrast in normal and resized fullscreen views. Settings scenarios assert an 8px (2x) footer gap and tab-to-content gap, visit all three tabs, preserve drafts across tabs, discard canceled edits, and reopen saved axis/jog-distance changes. MDI persistence is mocked; no server settings are changed.

Nested Axes command-editor scenarios open New and Update, reject empty fields, adjust button width by keyboard, cancel incomplete drafts, and apply edits only to the parent draft. ShuttleXpress scenarios adjust both range handles, enforce their ordering, change repeat rate and overshoot, and verify cancellation discards changes. Both run in light/dark; no G-code is executed and MDI HTTP writes remain intercepted.

Visualizer split-control checks assert joined InputGroup segment boundaries, equal heights, and centered chevrons for both 3D View and Upload G-code.

Workspace runtime-dialog scenarios publish feeder pause/error/wait and disconnect events from a private local Socket.IO server. They verify required prompts, prohibited Escape dismissal, clear-state closure, and Reload recovery. They never connect a CNC controller or send feeder commands to the existing server.

All five application Tabs consumers use TabPanels horizontal 3x / vertical 2x spacing. Controller snapshots open and switch TinyG, Smoothie, and Marlin dialogs; the Grbl simulator exercises its live controller dialog. Geometry assertions verify 12px horizontal and 8px vertical panel insets.

Widget modal scenarios (`widget-modals.spec.mjs`) cover Connection close confirmation, Custom/Webcam settings persistence, Macro New/Edit/Delete/Load/Run, Autolevel Test/Start/Stop safety confirmation, Watch Directory traversal/load/upload, M6 resume confirmation, and unavailable WebGL. Controller emissions terminate at an isolated fixture; they do not prove probing, macro execution, or machine motion. Macro Variables and Webcam device menus have keyboard-focus and pointer-selection checks. Probe previously failed before opening because its independent portal lost the widget provider. The source now renders its confirmation inside the real widget provider subtree; the unmocked-provider regression remains enabled.

After correcting nested-dialog identity, nested-file selection, and isolated-socket teardown in the spec, the widget-modal run excluding the known Probe failure passed all 16 light/dark executions. The complete earlier run exposed Probe failure in both themes; it is not counted as passing or skipped in the default suite.

Application drawer scenarios (`app-drawers.spec.mjs`) exercise stateful mocked create/update/delete or status flows for Commands, Events, Machine Profiles, Macros, and User Accounts; mutation failures and retry; General Settings save outcomes; Workspace Settings import/restore; corrupted-config recovery; narrow navigation dismissal; and secondary Axes fork/remove persistence. The first integrated run passed 26/28. Both restore-default cases then passed after removing an invalid session-token assertion: automatic sign-in can replace the cleared session after reload. No server records or settings are changed.

### Menu and dropdown coverage

Coverage is tracked per entry point, including menu-bearing modal/drawer fields. A shared Dropdown component test does not certify its consumers. `app-menus.spec.mjs` covers all five Administration page-size selectors (request size and page reset), application-menu Escape/outside dismissal, device-theme selection, appearance/language Back without mutation, and mini-navigation hover dismissal. Existing `navigation.spec.mjs` verifies appearance/language selections and navigation; `commands-menu.spec.mjs` verifies filtered command selection, mocked failures, and task lifecycle.

Historical keyboard regression: focusing Manage Commands and pressing Enter closed the menu without navigation. The repaired Commands menu uses data-driven Dropdown activation, an icon-only trigger, and a Commands heading with an adjacent edit menu action. The behavioral keyboard case remains enabled; no dependency patch or click substitution is used.

Historical widget-menu integration passed all 26 light/dark executions. Console pointer and keyboard selection, mocked copy, filename persistence, Connection selectors, Tool policies, controller command entries and widget outside-dismissal passed. Separate Axes subsets passed disconnected guards and all metric/imperial choices and jogs (6 executions). The 12 formerly failing Axes action/snapshot executions now exercise the repaired nested controller state and controlled outside-pointer dismissal; current repair results are recorded below. These historical runs are not complete-suite certification.

The historical complete `app-menus.spec.mjs` integration passed 16/18 light/dark executions; both failures were Commands Enter/navigation. Current source uses the supported Dropdown selection contract, and the original keyboard navigation check remains enabled.

| Entry points | Scenario mapping / current boundary |
| --- | --- |
| Header Application → Appearance, Language, Back | `navigation.spec.mjs`, `app-menus.spec.mjs`: select/persist/reload, Back, auto theme, dismissal |
| Header Commands | `commands-menu.spec.mjs`: mocked command/task flows and exactly-once Enter activation; `app-menus.spec.mjs`: heading, edit action keyboard navigation and outside dismissal |
| Mini navigation Administration hover | `navigation.spec.mjs`: child navigation; `app-menus.spec.mjs`: pointer-leave dismissal |
| Commands / Events / Machines / Macros / Users page size | `app-menus.spec.mjs`: each consumer selects a new size and resets page 2 to 1 |
| Axes Settings ShuttleXpress repeat rate | `axes-settings.spec.mjs`: select 15 Hz, cancel/reopen restores draft |
| Axes header and X/Y/Z/A/B/C actions | `axes-menus.spec.mjs`: Grbl entries and G54–G59 targets, nested controller type, outside dismissal and keyboard activation. Isolated simulator execution and captured snapshot-controller transmissions are distinct evidence |
| Axes keypad units and jog distances | `axes-menus.spec.mjs`: G20/G21, all 24 metric and 22 imperial choices, persistence and one jog per unit system pass in both themes. Separate step-menu keyboard traversal is not exercised |
| Axes non-Grbl action variants | `axes-menus.spec.mjs`: TinyG/Smoothie/Marlin variant entries and captured emissions, not hardware execution. E axis has no dropdown |
| Connection serial port / baud / transport / controller | `widget-menus.spec.mjs`: fake endpoint inventory, pointer/keyboard port selection, persistence, refresh, connected locking; all four light/dark executions pass |
| Console More | `widget-menus.spec.mjs`: pointer Select All/Clear Selection, mocked copy invocation, Refresh, and keyboard Select All pass in both themes. Selection is read through xterm's native copy event because the terminal is canvas-rendered |
| Probe axis / G38.2–G38.5 | `widget-menus.spec.mjs`: every choice, persisted config, native-button keyboard activation; `widget-modals.spec.mjs`: real provider context and generated-code confirmation |
| Tool policy / Insert Variable | `widget-menus.spec.mjs`: all five policies and mocked save bodies; `widgets.spec.mjs`: variable insertion |
| Visualizer WCS / 3D / Upload / camera / machine profile | `widget-menus.spec.mjs`: dismissals, filename toggle, profile select/clear; existing simulator WCS and visualizer camera/display scenarios |
| Grbl / Marlin / Smoothie / TinyG command menus | `widget-menus.spec.mjs`: 11 Grbl simulator commands; 3/6/9 other-controller captured emissions only, not hardware execution |
| Every available widget More menu | `widgets.spec.mjs`: labels, disabled states, fullscreen; `widget-menus.spec.mjs`: per-widget outside dismissal. Fork/remove effects use shared-handler representative scenarios |
| Macro New/Edit variables, Webcam device, Administration macro examples | `widget-modals.spec.mjs`: focus/pointer insertion and device selection; `app-drawers.spec.mjs`: keyboard/pointer macro insertion and dismissal |

### Repair verification boundary

Widget number fields use default InputGroup height instead of compact overrides; Tool position inputs and its policy dropdown measure 32px. Laser Test uses the same Tonic accordion composition as Grbl, and its Power percentage has no border or background. Tool command previews have a themed 1px border, 12px padding, and independent overflow scrolling. Targeted source lint passes; Axes unit behavior passes 22 tests, Probe passes 6, and Laser/Tool/Spindle/Marlin/Autolevel pass 52 tests across five suites.

The development HTML configuration evaluates its template for every compilation. After restarting the development group, all ten startup-before-bundle appearance scenarios passed: saved/system/missing/invalid/unavailable storage in both themes, including refresh and saved-theme React handoff. Compilation now preserves `favicon.ico` (the old `favicon.icon` typo removed it and caused server initialization to fail with ENOENT/404). The combined bootstrap/controller run passed 16/16. Controller snapshots now close the page, drain route handlers with `unrouteAll({ behavior: 'wait' })`, then close Socket.IO, preventing the disposed-response teardown race. This proves fixture cleanup, not physical-controller execution.

The integrated light/dark repair batch passed 32/34 executions. The two active-WCS cases clicked before the menu focus/Collapse transition was ready; after adding the same readiness check used by other menu consumers, the focused G55–G59 cases passed 2/2. Together these runs cover all 34 repair executions, but are not a single green complete-suite run. Passing behavior includes Commands heading/edit Enter navigation, exactly-once command Enter activation, task completion-before-HTTP races, Probe confirmation/provider context, Tool preview border/scroll/32px input geometry, Laser accordion/slider/settings, and all nine Axes scenarios per theme. Coordinate assertions read the label rather than live tooltip text; clearing G92 after zeroing G54 correctly retains work position zero.

### Widget coverage boundaries

All 17 registry widgets have disconnected rendering and responsive layout coverage. This does not mean that every widget operation is exercised.

| Widget | Exercised behavior | Remaining execution gap |
| --- | --- | --- |
| Connection | Transport/controller selection, validation, real simulator TCP connection | Serial connection, connection failure/reconnect |
| Console | Clear, menus, fullscreen, fixture terminal output/selection/copy | Command history and real-controller terminal behavior |
| Custom | Local enable/title/URL save, Escape and cancel | Actual iframe content, token and postMessage integration |
| G-code | Loaded filename and dimensions through simulator upload; mocked Watch Directory load/upload | Invalid/large files and real watch-file execution |
| Grbl | Simulator reports, controller tabs, overrides | Alarm and disconnect transitions |
| Marlin | Read-only controller snapshot, heater fields, report controls and tabs | Real command execution |
| Smoothie | Read-only controller snapshot, reports and tabs | Real command execution |
| TinyG | Read-only controller snapshot, reports and tabs | Real command execution |
| Axes | Disconnected guards, live simulator positions/jog/unit/WCS actions, controller-specific captured commands, keyboard/outside dismissal, Settings cancel/mocked save | Actual MDI execution; physical homing, G53 and additional-axis motion (transmission is not completed motion) |
| Macro | Mocked create/edit/delete errors and bodies, Load/Run dialog emissions | Actual macro execution |
| Autolevel | Local settings/validation, apply view, Test/Start/Stop safety gates and fixture emissions | Probing and compensation execution |
| Probe | Every axis/G38 choice, persisted settings, connected modal/setter modes and captured generated G-code inside the real widget provider | Actual probing, imperial/error paths and physical contact behavior |
| Tool | All policies, mocked save bodies, command editor and bordered/scrollable preview | Autosave lifecycle and actual tool-change execution |
| Spindle | Local speed and disabled actions | Spindle/coolant execution |
| Laser | Local slider/settings, simulator override readout | Fire/test commands |
| Webcam | Media-source settings without requesting a camera | Real stream, intentionally excluded |
| Visualizer | Camera/display controls, simulator upload/run, workflow buttons, dashboard, rendered-toolpath metrics (geometry, pivot, load sample, unload); mocked Watch Directory traversal/load/upload | Watch-directory refresh/add/error/change/drag branches, orbit/pan persistence, alarms and execution failure paths |

### Remaining coverage gaps

These are unverified behavior, not confirmed product defects. Keep them separate from failing-test records. Passing shared-component checks, mock responses, snapshots or captured commands do not certify these application flows.

- **Visualizer and workflow:** rendered toolpath content is asserted from development renderer metrics after load and cleared after unload; exercise orbit/pan/wheel/fit and persisted view state, mid-run transitions, alarms, malformed/large G-code and execution failure paths. Existing simulator pause/resume/stop and override checks do not certify every transition or physical machine behavior.
- **Probe, Autolevel and Tool:** execute probing, compensation and tool-change flows; verify imperial units, errors and generated/downloaded results. Current modal safety gates and captured commands prove UI intent only.
- **Controller and actuation:** real serial inventory/baud failures/reconnect, physical motion, Spindle/coolant and Laser firing remain unverified. Marlin/Smoothie/TinyG snapshots and command captures are not controller execution.
- **Embedded content and media:** Custom iframe rendering/token/postMessage and real Webcam streams remain unverified. Camera access and physical actuation are intentionally excluded from the current local suite; do not enable them merely to close a coverage gap.
- **Administration and persistence:** mocked writes do not prove backend validation, authentication/authorization, schemas, quotas or storage failures. Tool autosave and Console history need separate behavioral coverage.
- **Modal and responsive behavior:** remaining outside-dismissal/toast/nested-layer paths, narrow-screen interaction, text clipping and legibility need verification. Geometry checks and screenshots alone do not certify all readable content.
- **Watch Directory:** mocked traversal/load/upload is covered; refresh/add/error, `watchdir:change`, drag paths and actual loaded-file execution remain unverified.

Probe provider loss and Commands Enter navigation have been repaired and passed targeted light/dark scenarios; they are no longer open coverage gaps. Full-suite certification remains separate from these targeted results.

Focused Marlin screenshot review in both themes found no overlapping controls or error overlay; the heated-bed temperature status label is ellipsized. Dark muted text/icons still need a measured contrast and narrow-width review. Full-workspace viewport captures can cut off lower widgets at the viewport edge and do not replace scroll/reachability checks. These observations are not evidence of missing offscreen controls.

### Observed full audit

Latest full application verification: the explicit 18-spec light/dark run passed **298/298 tests in 42.2 minutes**, with one worker and no retries. Screenshots and reports were enabled. The 1024px Axes captures in both themes were reviewed and preserved at [axes-20261108](../../docs/superpowers/plans/2026-09-07-tonic-ui-v2/artifacts/browser/axes-20261108/). Tests used isolated local fixtures and the loopback simulator; snapshots and mocked requests do not represent physical controller execution.

The previous 290-test run's visual review of 34 per-widget captures found no obvious overlapping controls, unreadable text, incorrect theme surfaces or error overlays in those captured states. Disconnected controller headers and disabled controls are intentional. Additional toolpath, dashboard, ShuttleXpress and Marlin captures were inspected in both themes: Marlin's heated-bed label remains ellipsized; long Console lines are clipped at the right edge in workspace toolpath captures, and lower panels extend beyond the viewport. These observations remain review limitations, not proof of scroll reachability or measured contrast compliance. The coverage gaps above remain applicable despite the green run.

The preceding post-migration 290-execution light/dark run completed with 286 passes and four failures (42.7 minutes). The two failures per theme were Axes `Home`/`Enter` activation before requestAnimationFrame focus settled, and ShuttleXpress Repeat Rate selection before dropdown focus/Collapse readiness. Tests now assert actual focused menuitems after Home/ArrowDown and wait for the Repeat Rate menu's focus and visible overflow. The original keyboard input, command evidence, 15Hz assertion, no-retry policy and thresholds remain unchanged. The focused four-execution run passed 4/4 before the final unified run above.

The 166-execution audit completed with 151 passes and 15 failures. Ten startup-theme failures came from the running server's HTML lacking the pre-React appearance bootstrap; source changes were not rebuilt or injected by the runner. Four Commands table failures came from the header's independent `paging=false` request consuming a held table response. The mock now distinguishes those requests; the complete table-loading suite subsequently passed 18/18. One dark Autolevel file-chooser timeout remains unclassified. This audit overlapped source edits and does not certify the final source or the subsequently added modal/drawer scenarios.

The later stable seven-file widget/controller/Visualizer/simulator/layout/Axes/workspace regression run reached 101 passes, one failure, and six not run. The dark Laser screenshot metric returned visibleRatio 0.04 against a strict >0.04 assertion; the threshold was not weakened. The six remaining dark workspace cases were run separately and all passed. Both Autolevel file-chooser scenarios passed in the stable run. These results do not include the additional modal/menu specs under integration.

## Safety and isolation

- Each scenario uses a new browser context, independent of the user's browser profile. Reloads within a scenario preserve its local changes.
- Automatic connection is disabled. Disconnected scenarios do not open serial ports or request a camera.
- Simulator scenarios start a fresh instance of the repository's real Grbl simulator on an ephemeral TCP port. They connect only to that instance, close the CNCjs connection, and terminate the instance afterward. They require a local CNCjs backend. No physical controller is used.
- Controller snapshot scenarios proxy only Socket.IO traffic to an isolated local fixture that publishes Marlin, Smoothie, and TinyG state. They exercise the real application UI without connecting a controller or simulating command success. Grbl execution remains covered by the real simulator.
- Every scenario installs a fail-closed Socket.IO guard (`support/socket-guard.mjs`). It permits only `getPorts`/`getBaudRates` plus, while a test-owned loopback simulator is explicitly approved, that simulator's `open`/`close`/`command`/`write`/`writeln` traffic with allowlisted command names. Unrecognized packets, other controller identifiers, binary/JSONP frames, and unsupported transports abort and fail the scenario. `support/socket-safety.spec.mjs` covers the polling, WebSocket, and upload policies without a CNCjs backend.
- The shared API fixture aborts unexpected writes. It permits `POST /api/gcode` only for the simulator's repository-derived controller identity while the simulator fixture is active; non-simulator uploads are blocked unless a scenario mocks them. Watch-directory POSTs remain allowed because they list or read the configured directory; `PUT` writes are blocked.
- These guards limit what the browser can do, not what the backend may already be doing: opening and closing a connection can trigger configured system events, and approved commands still run on the target controller. Use an isolated local backend with a task-owned configuration and watch directory, and never connect physical hardware. CRUD success and destructive actions are not exercised against a user's server.
- One worker and no retries prevent simultaneous simulator/controller operations and do not hide flaky failures.
- Uncaught page exceptions fail a scenario.

### Authenticated local server

Set `E2E_USERNAME` and `E2E_PASSWORD` in the runner's process environment when the local server requires sign-in. Do not put credentials in source files or committed configuration. The fixture signs in once per worker using native HTTP and keeps the session in its isolated browser context. Credential-based sign-in is restricted to localhost.

Traces are disabled for authenticated runs, even with `E2E_REPORTS=1`, so request/session secrets are not retained in trace archives. HTML reports and screenshots remain available.

## Screenshots and reports

```sh
E2E_SCREENSHOTS=1 E2E_REPORTS=1 yarn test:e2e
```

Generated files are under the ignored `output/e2e/` directory:

- `screenshots/<light|dark>/<case>-<hash>/<run>/`: every capture goes through `support/screenshots.mjs`. Each test run gets its own run directory, so different tests, color modes, and repeated runs never overwrite each other. `manifest.json` lists the shots for that case with the source file and test title path. Shots cover widgets, fullscreen frames, controller cards, bootstrap loading, Axes dialogs, the loaded Visualizer toolpath and dashboard, and a `final-page` capture taken before teardown. These are review artifacts, not automatically approved pixel baselines.
- `results.json`: machine-readable results for both modes.
- `results/`: retained failure artifacts when reports are enabled; Playwright names each result directory with its project (`light` or `dark`).
- `report/`: HTML report, enabled with `E2E_REPORTS=1`. Traces are retained only for failures.

Without `E2E_SCREENSHOTS=1` no screenshots are written. Captures are supplemental: each scenario still asserts behavior, and a capture failure is recorded as an annotation instead of hiding the scenario result.

The layout scenarios assert usable card widths, no widget horizontal overflow, no document-level overflow, reachable panel controls, the applied application theme, and a transparent WebGL clear color over the correct light/dark surface. On narrow screens the workspace scrolls horizontally instead of crushing CNC controls. Screenshots still require visual review; passing geometry assertions do not prove all visual details are correct.

`E2E_BASE_URL` overrides `http://localhost:8000`. `E2E_BROWSER_PATH` chooses an existing Chromium executable. Additional Playwright CLI flags are forwarded after the suite name.
