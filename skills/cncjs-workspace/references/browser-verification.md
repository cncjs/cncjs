# Browser verification for workspace changes

Use the existing `test/e2e/support/fixtures.mjs` contract; read
`test/e2e/README.md` and the relevant scenario before writing a spec.

`openWorkspace(page)` navigates to `/#/workspace` and waits for Connection and
Visualizer. Each scenario gets a fresh context; the init script seeds
appearance, language, workspace groups, and
`widgets.connection.autoReconnect = false` once, so reloads preserve local
changes.

## Verification matrix

| Change | Minimum verification |
| --- | --- |
| Shell, registry, layout, fork/remove, collapse/fullscreen | Workspace unit tests plus the `workspace` e2e suite (`workspace.spec.mjs`, `layout.spec.mjs`, `workspace-modals.spec.mjs`); both themes for visual changes |
| Widget-local UI, widget config, menus, modals | Widget unit tests plus the matching `widgets.spec.mjs`, `widget-menus.spec.mjs`, or `widget-modals.spec.mjs` scenario; run the `widgets` suite or filter it with `--grep` |
| Widget controller display/state | Widget unit tests plus `controllers.spec.mjs` in the `widgets` suite for snapshot rendering; use `simulator.spec.mjs` in the `visualizer` suite only when real execution is in scope |
| Command, Socket.IO event, payload, or HTTP contract | Server unit tests plus the cross-boundary scenario: `yarn test:e2e visualizer` or `yarn test:e2e safety`; verify emitter, client bridge, widget subscription, and UI effect |
| Theming, sizing, contrast, WebGL surface | Unit behavior plus the `workspace` and `widgets` e2e suites in light and dark, with screenshots reviewed |

A green unit test proves the component handler, not that the server emits the
event, the client bridge forwards it, or the simulator executes the command. A
cross-boundary change therefore requires at least one integration scenario in
addition to unit tests.

## Widget presence and shell state

- Assert the host: `widget(page, 'axes')`, `[data-widget-id="axes"]`, and the
  expected `role="region"` label.
- Assert observable behavior: `aria-expanded` for collapse, content visibility,
  `position: fixed` and viewport-relative bounds for fullscreen, `overflow-y:
  auto` for fullscreen content.
- Do not expect Grbl/Marlin/Smoothie/TinyG content before
  `startup.availableControllers` includes their type.
- Fork/remove: confirm the dialog, assert `[data-widget-id^="console:"]` count,
  match the fork ID with `/^console:/`, and assert `widgets[forkedId]` in
  persisted state. Verify cancel leaves both DOM and config unchanged.

## Persisted state

- Read `JSON.parse(localStorage.getItem('cnc')).state`. Workspace assertions use
  `workspace.container.<group>.widgets` and `.show`; collapse assertions use
  `widgets[widgetId].minimized`.
- Persistence is debounced. After a click, poll instead of reading once:
  `await expect.poll(async () => (await getState(page)).workspace.container.primary.show).toBe(false);`
- Reload after a layout or widget-config change and assert the same DOM and
  persisted values. A successful click alone does not prove persistence.
- Fullscreen is ephemeral: do not assert it survives reload. Collapse, panel
  visibility, widget order, fork creation, and widget config do survive.
- Fork state is isolated: changing `widgets.axes.minimized` must not change
  `widgets["axes:fork-1"].minimized`.
- Workspace Settings import validates `{ version: string, state: object }`;
  restore-default persists and reloads.

## Widget state and commands

- Assert local draft and committed state separately. Settings dialogs preserve
  drafts across tabs, discard on cancel, and reopen saved values.
- Controller widgets filter events by type. Emit or mock the matching
  `(type, payload)` and assert the UI ignores other controller types.
- For a command path, assert the exact call and args at the widget boundary in a
  unit test, then assert the observed effect in an integration test. Do not
  infer execution from a rendered button or a mocked callback. Command names,
  payloads, and write-vs-writeln choices belong to `cncjs-controller`.
- With the real simulator, assert the emitted line and the absence of
  unintended commands. Execution scenarios assert a line such as
  `CMD: G1 X10 Y5 F600 ->`; a loaded-toolpath appearance change separately
  asserts that no G-code motion was sent:
  `expect(simulator.commands.filter(line => / CMD: G(?:0|1|2|3)(?:\s|$)/.test(line))).toEqual([]);`

## Layout, theme, and visual checks

- Check the document has no horizontal overflow at 1440, 1280, 1024, 800, and
  390 px; widget cards keep controls reachable and do not crush CNC controls.
- The application theme is seeded per project; assert `html[data-color-scheme]`
  matches the project. Changing only the OS scheme is not a theme test.
- WebGL must show the themed surface, not an opaque white clear color. Check
  the actual canvas surface in both themes.
- Tonic menus: after opening, wait until the menu contains
  `document.activeElement` and a descendant `[data-tonic="Collapse"]` has
  `overflow: visible`. Focus alone can scroll the pointer target. Persistent
  menus dismiss on real outside interaction, including the WebGL canvas; blur
  is insufficient. Include portalled content when checking outside targets.
- Read installed semantic palettes before painting SVGs. In the installed Tonic
  alpha, `success.text` and `info.text` are absent; valid paths include
  `success._onOverlay.text` and `info._onOverlay.text`. Missing fills can
  silently become black.
- Screenshots are review artifacts, not pixel baselines. With
  `E2E_SCREENSHOTS=1`, captures and manifests live under
  `output/e2e/screenshots/`; with `E2E_REPORTS=1`, the HTML report is
  `output/e2e/report/index.html`. Inspect the actual images in both modes.

## Cross-boundary Socket.IO and API checks

When a workspace widget consumes server state or sends commands, verify the
whole chain:

| Boundary | What to verify |
| --- | --- |
| Startup visibility | Server sends `startup` with `availableControllers`; `selectVisibleWidgetIds` shows only matching controller widgets |
| Connection state | Connection widget opens the approved endpoint; `connection:open` populates type/ident/options; `connection:close` returns widgets and workflow to disconnected/idle |
| Controller state | Controller emits `controller:settings`/`controller:state` as `(type, payload)`; the widget filters by type and renders the payload |
| Workflow/safety | `workflow:state` gates drop/upload actions; `feeder:status` drives pause/wait/error modals; safety prompts reject Escape and only clear on the expected event |
| Commands | `controller.command('gcode', ...)` reaches the server as the Socket.IO `command` event; the simulator logs the expected `CMD:`/`RT:` line and no unintended command |
| G-code upload | Visualizer upload posts `/api/gcode`; only the approved simulator identity may pass the API guard |
| Watch directory | `watchdir:change` and `/api/watch/*` are read/listing paths; writes remain blocked unless a scenario explicitly mocks them |
| Tool config | `/api/tool` reads may pass the guard; writes are mocked or blocked in disconnected/widget scenarios. A passing UI save does not prove server persistence |

For a server-side event or command change, also check the emitter in
`src/server/controllers/`, the event name in `CNCJSController.listeners`, the
widget subscription, and the e2e assertion. A missing link means the
integration is incomplete even if both sides have unit tests.

Scenarios to use: `simulator.spec.mjs` for real loopback execution,
`controllers.spec.mjs` for read-only snapshots, `workspace-modals.spec.mjs` for
feeder/disconnect events, and `socket-safety.spec.mjs` for guard policy. Do not
substitute a unit test, a mocked route, or a captured emission for the scenario
that actually crosses the boundary.

## Guard and mock scope

- The simulator fixture starts a fresh repository Grbl simulator on an
  ephemeral loopback TCP port. It approves only `127.0.0.1`, the `Grbl` socket
  connection, the derived `ident`, and an explicit command-name allowlist.
- The Socket.IO guard is fail-closed and must remain the last matching context
  route. Do not add page routes for `/socket.io`, do not mix polling-proxy and
  simulator approval, and do not bypass unrecognized packets. If a legitimate
  new command is required, add it explicitly to the fixture's allowlist and
  review the reason.
- The API guard aborts unexpected writes. It permits `GET`/`HEAD`/`OPTIONS`,
  local sign-in, watch listing/read POSTs, and a simulator-identity
  `/api/gcode` upload while the simulator fixture is active. `PUT`, `DELETE`,
  and other writes are forbidden unless the scenario itself mocks them.
- Controller snapshots proxy only Socket.IO traffic to an isolated polling
  fixture that publishes controller snapshots such as Marlin/Smoothie/TinyG
  state. They prove connected rendering, not controller execution or command
  success.
- Workspace runtime-modal scenarios use a private local Socket.IO server for
  `feeder:status` and disconnect events.
- Simulator command lines are execution evidence for that ephemeral simulator
  only. They are not physical motion, probing, spindle, laser, or tool-change
  evidence.
- One worker and zero retries are intentional; fix the source or the fixture
  teardown rather than loosening the run.

## Commands

The e2e runner uses the already-running development server and does not start,
stop, or rebuild it. Start `yarn dev` first (or point `E2E_BASE_URL` at the
local instance); if it is serving a stale bundle, restart it rather than
expecting the runner to rebuild.

```sh
# Unit: frontend widgets/layout (jsdom)
yarn test:frontend
yarn test:frontend --runTestsByPath src/app/pages/Workspace/__tests__/WidgetLayoutContract.test.jsx --coverage=false

# Unit/integration: server and Grbl simulator (Node)
yarn test
yarn test --runTestsByPath src/server/services/__tests__/DirectoryWatcherService.test.js --coverage=false

# Browser E2E: existing local dev server required
yarn test:e2e workspace
yarn test:e2e widgets
yarn test:e2e visualizer
yarn test:e2e safety
yarn test:e2e all --project=dark
yarn test:e2e all --grep "simulator:"
yarn test:e2e all --list

# Review artifacts
E2E_SCREENSHOTS=1 E2E_REPORTS=1 yarn test:e2e all
E2E_BROWSER_PATH="/path/to/Chromium" yarn test:e2e all
```

`yarn test:e2e <suite>` accepts `all`, `widgets`, `visualizer`, `navigation`,
`administration`, `workspace`, and `safety`. Additional Playwright flags are
forwarded. `E2E_BASE_URL` overrides the default local URL.

## Reporting

Separate the evidence:

- **Unit/component:** handlers, reducers, selectors, and isolated rendering.
- **Mocked or captured:** HTTP mocks, controller snapshots, and captured
  Socket.IO emissions; UI behavior only.
- **Simulator execution:** real loopback Grbl simulator responses and command
  logs.
- **Visual review:** screenshots actually inspected, in each theme.

Never present a snapshot, a mocked request, or a captured emission as physical
controller execution. State any boundary left unexercised rather than implying
full coverage.
