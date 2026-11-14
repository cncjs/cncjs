# Controller verification ladder

Choose the lowest level that proves the change, then climb only when the
boundary itself changed. Record which level actually ran; never present a mock
or fixture as simulator or hardware evidence.

| Level | What runs | Proves | Does not prove |
| --- | --- | --- | --- |
| L0 Unit with fake connection | `createController` replaces `controller.connection` with `{ isOpen, write }`; logger is mocked | command bytes, feeder/sender sequencing, state updates, socket event payloads | serial transport, simulator behavior, browser wiring |
| L1 In-process simulator | `yarn jest grbl-simulator` and `GrblController.autolevelSimulator.test.js` | real simulator parsing, planner, status, alarm, soft-reset logic; controller-to-simulator probe integration | TCP/serial transport, app UI |
| L2 TCP simulator | `grbl-server.js` plus `test-client/main.js` | real socket transport and Grbl wire exchange | app UI, backend controller, Socket.IO |
| L3 Isolated manual app | `yarn build-dev`, a task-owned config/watch backend, and a task-owned simulator bridge | developer smoke check of app, Socket.IO, engine, and controller | automated evidence; physical machine behavior |
| L4 Hardware | not used | — | — |

## L0: server controller and parser tests

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

## L1: in-process simulator

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
in-process simulator evidence for the controller, not TCP or app evidence.

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

A manual connection check is only valid when the backend uses a task-owned
config file and watch directory, and the simulator uses a task-owned serial
path:

1. Inspect existing locale changes before `yarn build-dev`: it runs the
   localization scanners, which write locale files.
2. Create a task-owned directory with a `cncrc.json` and an empty `watch/`
   directory. The config must list only the task-owned simulator path:
   `{ "ports": [{ "path": "<task-dir>/ttyGRBL", "manufacturer": "Grbl Simulator" }] }`.
3. The simulator TCP server listens on all interfaces. Only on a
   network-isolated host, start `node grbl-simulator/grbl-server.js <sim-port>`
   using a free task-owned port. Otherwise stop and report the connection as
   unverified. Confirm it started; do not connect to an existing service.
4. Bridge the task-owned simulator port to the task-owned path:
   `node grbl-simulator/serial-bridge.js <sim-port> "<task-dir>/ttyGRBL"`.
   This requires `socat`; it is a manual development convenience only.
5. Start the backend on a free port bound to loopback:
   `NODE_ENV=development ./bin/cncjs -H 127.0.0.1 -c "<task-dir>/cncrc.json" -w "<task-dir>/watch" -p <backend-port> --controller Grbl`.
6. Start the app dev server separately with
   `WEBPACK_DEV_SERVER_HOST=127.0.0.1 PROXY_TARGET=http://127.0.0.1:<backend-port> yarn start-app-dev`.
7. Connect the Connection widget to the task-owned path and exercise the
   changed widget.

If any of these steps cannot be completed with the documented options, report
the manual connection as unverified and stop at the unit/simulator levels. Do
not fall back to a shared config, a shared serial path, or a plain `yarn dev`
server.

Manual observation is not an automated browser test, simulator execution, or
physical-machine evidence.

## Reporting

Report the highest level actually exercised and the boundary it covered.
Simulator output is not physical machine behavior. A manual app check is
manual browser observation, not an automated browser test.
