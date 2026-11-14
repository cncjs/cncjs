# Workspace verification

This checkout has no browser test runner. Use the available Jest and lint
checks for code behavior, and treat a running-app review as manual browser
observation. Never describe a manual check as an automated test or as
simulator/physical execution evidence.

## What exists

| Check | How | Proves |
| --- | --- | --- |
| App component pattern | `yarn jest src/app/components/Webcam/__tests__/Webcam.test.js` | direct component logic in the Node test environment |
| Server controller/state contract | `yarn jest src/server/controllers` | command bytes, runner state, emitted socket payloads |
| In-process simulator | `yarn jest grbl-simulator` | simulator parsing, planner, status, alarm behavior |
| Source lint | `yarn lint` or `yarn eslint` | ESLint, Stylus, and i18n JSON validity |
| Manual app review | `yarn build-dev`, a task-owned config/watch backend, and a task-owned simulator bridge | developer smoke check only |

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

For a command, controller-state, or connection change, use the controller
tests and the in-process simulator:

```sh
yarn jest src/server/controllers/Grbl/__tests__/GrblController.test.js
yarn jest src/server/controllers/Grbl/__tests__/GrblController.autolevelSimulator.test.js
```

`src/server/controllers/__tests__/helpers/createController.js` supplies a fake
connection; tests add a socket stub to capture `serialport:write` and other
emitted events. There is no existing `CNCEngine` test, so a change to the
missing/closed-port guard needs a new narrow test or must be reported as
unverified. A mocked controller cannot certify the server or Socket.IO
boundary.

## Manual app review

A manual review is only valid against a task-owned local backend and the
repository simulator. Do not use a plain `yarn dev` server, `~/.cncrc`, or the
shared `/tmp/ttyGRBL` path.

1. Inspect existing locale changes before `yarn build-dev`: it runs the
   localization scanners, which write locale files.
2. Create a task-owned directory with a `cncrc.json` and an empty `watch/`
   directory. List only the task-owned simulator path in the config:
   `{ "ports": [{ "path": "<task-dir>/ttyGRBL", "manufacturer": "Grbl Simulator" }] }`.
3. The simulator TCP server listens on all interfaces. Only on a
   network-isolated host, start `node grbl-simulator/grbl-server.js <sim-port>`
   using a free task-owned port. Otherwise stop and report the connection as
   unverified. Confirm it started; do not connect to an existing service.
4. Bridge the task-owned simulator port to the task-owned path:
   `node grbl-simulator/serial-bridge.js <sim-port> "<task-dir>/ttyGRBL"`.
   This requires `socat`; it is a manual development convenience only.
5. Start the backend on a free port bound to loopback, for example:
   `NODE_ENV=development ./bin/cncjs -H 127.0.0.1 -c "<task-dir>/cncrc.json" -w "<task-dir>/watch" -p <backend-port> --controller Grbl`.
6. Start the app dev server separately with
   `WEBPACK_DEV_SERVER_HOST=127.0.0.1 PROXY_TARGET=http://127.0.0.1:<backend-port> yarn start-app-dev`.
   `-c` and `-w` select the isolated config and watch directory.
7. Exercise the changed widget: collapse/expand, fullscreen, fork/remove,
   drag between primary and secondary, and the controller controls that the
   change touches.
8. Reload the page and confirm the same layout and widget configuration.

If the task-owned setup cannot be completed with these documented options,
report the manual connection as unverified and limit verification to the
unit/simulator levels.

This checkout has no theme switcher, so review the single theme. Check the
states you changed at common window widths; fullscreen is a CSS-module class,
not a `data-*` attribute.

Manual observation is browser/visual evidence, not an automated browser test
or simulator/physical execution evidence.

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
