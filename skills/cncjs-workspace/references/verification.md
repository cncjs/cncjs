# Workspace verification

This checkout has no browser test runner. Use the available Jest and lint
checks for code behavior, and treat a running-app review as manual browser
observation. Never describe a manual check as an automated test or as
simulator/physical execution evidence.

## What exists

| Check | How | Proves |
| --- | --- | --- |
| App component pattern | `yarn jest src/app/components/Webcam/__tests__/Webcam.test.js` | direct component logic in the Node test environment |
| Server controller/state contract | `yarn jest src/server/controllers` | controller write payloads, runner state, emitted socket payloads; not encoded serial bytes |
| In-process simulator | `yarn jest grbl-simulator` | simulator parsing, planner, status, alarm behavior |
| Full source lint | `yarn lint` | ESLint, Stylus, and i18n JSON validity |
| ESLint only | `yarn eslint` | JavaScript/JSX lint, not Stylus or i18n JSON |
| Manual app review | `yarn build-dev`, an isolated backend and browser, and a task-owned simulator bridge | developer smoke check only |

This checkout has no widget test suite, React Testing Library, Enzyme, jsdom
setup, Playwright configuration, `test/e2e` directory, or `test:e2e` script.
Do not claim these exist. The root Jest config runs in the Node environment,
with a 10 second timeout, and includes app, server, and simulator tests.

## Component tests

The Webcam test is the only app test:

```sh
yarn jest src/app/components/Webcam/__tests__/Webcam.test.js
```

It constructs the component directly, stubs `setState`, mocks `app/lib/log`,
and flushes with `setImmediate`. If you add a focused component test, follow
that pattern. It proves component logic only; it does not render a DOM, mount a
widget in the workspace, or exercise Socket.IO.

## Cross-boundary checks

For a command, controller-state, or connection change, select tests for the
affected controller. For example, a Marlin change starts with its own tests:

```sh
yarn jest src/server/controllers/Marlin/__tests__/MarlinController.test.js
```

For a relevant Grbl change, its unit tests and in-process probe simulator are:

```sh
yarn jest src/server/controllers/Grbl/__tests__/GrblController.test.js
yarn jest src/server/controllers/Grbl/__tests__/GrblController.autolevelSimulator.test.js
```

The Grbl simulator does not exercise Marlin, Smoothie, or TinyG protocol
behavior. Use the relevant controller's tests and a suitable integration
scenario if available; otherwise report that boundary as unverified.
`src/server/controllers/__tests__/helpers/createController.js` supplies a fake
connection; tests add a socket stub to capture `serialport:write` and other
emitted events. There is no existing `CNCEngine` test, so a change to the
missing/closed-port guard needs a new narrow test or must be reported as
unverified. A mocked controller cannot certify the Socket.IO boundary.

## Manual app review

A manual review requires a task-owned local backend, browser profile and
origin, and repository simulator. Do not use a plain `yarn dev` server,
`~/.cncrc`, or the shared `/tmp/ttyGRBL` path. This connection procedure
exercises Grbl, not another controller protocol.

1. Before `yarn build-dev`, inspect `output/`, `src/package.json`, and locale
   files. The build removes `output/*`, `package-sync` rewrites
   `src/package.json`, and the localization scanners write locale files.
   Use a task-owned isolated checkout when needed; obtain permission before
   deleting pre-existing generated, untracked, or unrelated data, and do not
   overwrite unrelated edits. Run the build only when its effects are safe.
2. Create a unique task-owned directory under `$TMPDIR` with empty `home/` and
   `watch/` directories and a `cncrc.json`. List only the task-owned simulator
   path in the config:
   `{ "ports": [{ "path": "<task-dir>/ttyGRBL", "manufacturer": "Grbl Simulator" }] }`.
   This list supplements serial discovery; it does not block physical ports.
3. The simulator TCP server listens on all interfaces. Only on a
   network-isolated host, start `node grbl-simulator/grbl-server.js <sim-port>`
   using a free task-owned port. Otherwise stop and report the connection as
   unverified. Confirm it started; do not connect to an existing service.
4. Bridge the task-owned simulator port to the task-owned path:
   `node grbl-simulator/serial-bridge.js <sim-port> "<task-dir>/ttyGRBL"`.
   This requires an already-installed `socat` and is a manual convenience only.
5. Start the backend on a free port bound to loopback:
   `HOME="<task-dir>/home" NODE_ENV=development ./bin/cncjs -H 127.0.0.1 -c "<task-dir>/cncrc.json" -w "<task-dir>/watch" -p <backend-port> --controller Grbl`.
   `-c` and `-w` do not isolate sessions: startup recursively deletes
   `$HOME/.cncjs-sessions`. On Windows, isolate `USERPROFILE` instead.
6. Start the app dev server separately on a free task-owned loopback port:
   `WEBPACK_DEV_SERVER_HOST=127.0.0.1 PROXY_TARGET=http://127.0.0.1:<backend-port> yarn start-app-dev --port <app-port>`.
   Confirm the app server started at the intended origin and targets the
   task-owned backend; never reuse an existing service. Webpack also writes
   and cleans files under `output/cncjs/app`.
7. Open that origin in a fresh task-owned browser profile or isolated disposable
   browser context, with no saved workspace or credentials. Do not clear an
   existing profile's `localStorage.cnc` or use Electron's existing user config.
   Disable auto-reconnect before selecting the simulator path; the default
   workspace enables it. Connect only to the task-owned path, never a
   discovered physical port. Exercise the changed widget and relevant
   collapse/expand, fullscreen, fork/remove, drag, and controller controls.
8. Reload the page and confirm the same layout and widget configuration.
   Stop only the task-owned processes when finished.

If any prerequisite cannot be met, report the manual connection as unverified.
Do not fall back to a shared home, config, browser profile, serial path, or
plain `yarn dev` server.

This checkout has no theme switcher, so review the single theme. Check the
states you changed at common window widths; fullscreen is a CSS-module class,
not a `data-*` attribute.

Manual browser observation is not an automated test or proof of physical
behavior; UI observation alone does not prove simulator command execution.

## Persistence checks

Workspace state is stored locally, not on the server:

- Browser: `localStorage.cnc`, shaped as `{ version, state }` with
  `state.workspace.container.{default,primary,secondary}` and
  `state.widgets.<widgetId>`.
- Electron: the user config read and written through IPC.

Verify persistence by reloading and re-reading the stored state, not by one
successful click. Confirm that a forked widget keeps its own
`widgets.<name>:<uuid>` branch and that removing it unsets that branch.

## Reporting

Report the boundary exercised and the evidence kind: unit/component, mocked or
captured, simulator, or manual browser/visual observation. A passing lint or a
manual click is not an automated browser test, and a simulator run is not
physical machine behavior.
