# Controller verification ladder

Choose the lowest level that proves the change, then climb only when the
boundary itself changed. Record which level actually ran; never present a mock
or fixture as simulator or hardware evidence.

| Level | What runs | Proves | Does not prove |
| --- | --- | --- | --- |
| L0 Unit with fake connection | `createController` replaces `controller.connection` with `{ isOpen, write }`; logger is mocked | controller write payloads, feeder/sender sequencing, state updates, socket event payloads | encoded serial bytes, serial transport, simulator behavior, browser wiring |
| L1 In-process Grbl simulator | `yarn jest grbl-simulator` and `GrblController.autolevelSimulator.test.js` | Grbl simulator parsing, planner, status, alarm, soft-reset logic; Grbl controller-to-simulator probe integration | other controller protocols, TCP/serial transport, app UI |
| L2 TCP Grbl simulator | `grbl-server.js` plus `test-client/main.js` | real socket transport and Grbl wire exchange | other controller protocols, app UI, backend controller, Socket.IO |
| L3 Isolated manual Grbl app | `yarn build-dev`, an isolated backend and browser, and a task-owned simulator bridge | developer smoke check of app, Socket.IO, engine, and Grbl controller | other controller protocols, automated evidence, physical machine behavior |
| L4 Hardware | not used | — | — |

## L0: server controller and parser tests

Choose the affected controller's tests; these are Grbl examples:

```sh
yarn jest src/server/controllers/Grbl/__tests__/GrblController.test.js
yarn jest src/server/controllers/Grbl/__tests__/GrblRunner.test.js
yarn jest src/server/controllers
```

`src/server/controllers/__tests__/helpers/createController.js` installs the
fake connection. Tests add a socket stub (`controller.sockets.test`) so
`serialport:write` and other emitted events are recorded. Assert exact writes
and both channels where relevant: `writes` records the fake connection, while
`socketEvents` records `serialport:write` and other emitted events. Grbl tests
call `clearInterval(controller.queryTimer)` because the controller starts a
250 ms query loop; do not remove that cleanup.

Direct unit calls to `controller.command` bypass the `CNCEngine` socket guard,
so a closed-connection test must set `connection.isOpen = false` and assert no
writes. There is no existing `CNCEngine` test; a change to the missing/closed
port guard needs a new narrow test or must be reported as unverified.

## L0: app component tests

The only app test in this checkout is the Webcam component test:

```sh
yarn jest src/app/components/Webcam/__tests__/Webcam.test.js
```

It runs under the root Jest config in the Node environment, constructs the
component directly, stubs `setState`, mocks `app/lib/log`, and flushes with
`setImmediate`. There is no React Testing Library, Enzyme, jsdom widget suite,
or frontend-only test script. Use this test only as a pattern if you add a
focused component test; it proves component logic, not DOM or Socket.IO
behavior.

## L1: in-process Grbl simulator

```sh
yarn jest grbl-simulator
yarn jest src/server/controllers/Grbl/__tests__/GrblController.autolevelSimulator.test.js
```

The first command runs the simulator's Jest tests. Do not run
`node grbl-simulator/__tests__/*.test.js` or the simulator package's `test`
script: both invoke Node directly, but the tests require Jest globals.

`GrblController.autolevelSimulator.test.js` wires
`controller.connection.write` to `GrblSimulator.processLineAsync` and feeds the
simulator's replies and `PRB` reports back through `controller.runner.parse`.
Its two probe runs allow up to 70 seconds, so keep its timeout. This is real
in-process Grbl simulator evidence for that controller, not TCP or app evidence.
It does not verify Marlin, Smoothie, or TinyG behavior; use their own tests and
an applicable integration scenario, or report the boundary unverified.

## L2: TCP simulator integration

Run the server only on a network-isolated host: it listens on all interfaces.
Choose a free task-owned port, set `SIM_PORT` in both terminals, and confirm
the server started before connecting. Otherwise report TCP integration as
unverified.

```sh
# terminal 1
cd grbl-simulator && node grbl-server.js "$SIM_PORT"

# terminal 2
cd grbl-simulator && node test-client/main.js "$SIM_PORT" motion
```

The server's code default port is 5000 even though the README says 3000; trust
the code. `test-client/main.js` accepts `[port] [suite...]`; suites are
`client`, `motion`, `streaming`, `probe`, `jog`, `wco`, `coordinate`,
`refresh`, `coolant`, and `settings`. `yarn test-grbl-server` in
`grbl-simulator` starts the server and runs the client against the default
port. `GrblServer` shares one simulator across clients, so reset state between
independent scenarios.

Useful simulator surfaces for targeted probes: `processRealtimeCommand(char)`,
`processLine(line)`, `processLineAsync(line, callback)`, `on('data')`,
`triggerAlarm(code)`, and `getStartupMessage()`. The startup banner is
`Grbl 1.1h ['$' for help]`.

## L3: isolated manual app check

This checkout has no Playwright configuration, no `test/e2e` directory, and no
`test:e2e` script. Do not describe or add a browser test runner as existing
infrastructure, and do not run a plain `yarn dev` server or reuse
`~/.cncrc`/`/tmp/ttyGRBL` for validation.

This is a Grbl-only manual check. It requires a task-owned backend home, config
and watch directory, simulator path, browser profile, and loopback app origin:

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
   workspace enables it. Connect only to the task-owned path and exercise the
   changed widget, never a discovered physical port.
8. Stop only the task-owned processes when finished.

If any prerequisite cannot be met, report the manual connection as unverified.
Do not fall back to a shared home, config, browser profile, serial path, or
plain `yarn dev` server.

Manual browser observation is not an automated test or proof of physical
behavior; UI observation alone does not prove simulator command execution.

## Reporting

Report the highest level actually exercised and the boundary it covered.
Simulator output is not physical machine behavior. A manual app check is
manual browser observation, not an automated browser test.
