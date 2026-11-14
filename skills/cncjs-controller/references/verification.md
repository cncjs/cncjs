# Controller verification ladder

Choose the lowest level that proves the change, then climb only when the
boundary itself changed. Record which level actually ran; never present a mock
or fixture as simulator or hardware evidence.

| Level | What runs | Proves | Does not prove |
| --- | --- | --- | --- |
| L0 Unit with fake connection | `createController` replaces `controller.connection` with `{ isOpen, write }`; logger is mocked | command bytes, feeder/sender sequencing, state updates, socket event payloads | serial transport, simulator behavior, browser wiring |
| L1 In-process simulator | Root Jest runs `grbl-simulator/__tests__/grbl-simulator.test.js` against `GrblSimulator` | real simulator parsing, planner, status, alarm, soft-reset logic | TCP/serial transport, CNCjs controller, app |
| L2 TCP simulator | `grbl-server.js` plus `test-client/main.js` | real socket transport and Grbl wire exchange | app UI, backend controller, Socket.IO |
| L3 Browser E2E | Playwright + running CNCjs backend + ephemeral real simulator | app, Socket.IO, service engine, controller, simulator together | physical machine behavior |
| L4 Hardware | not used | — | — |

## L0: server controller and parser tests

```sh
yarn jest src/server/controllers/Grbl/__tests__/GrblController.test.js
yarn jest src/server/controllers/Grbl/__tests__/GrblRunner.test.js
yarn jest src/server/controllers
```

Assert exact writes and both channels where relevant: `writes` records the
fake connection, while `socketEvents` records `connection:write` and other
emitted events. Grbl tests call `clearInterval(controller.queryTimer)` because
the controller starts a 250 ms query loop; do not remove that cleanup.

Direct unit calls to `controller.command` bypass the socket guard, so a
closed-connection test must set `connection.isOpen = false` and assert no
writes.

## L0: app controller and widget tests

```sh
yarn test:frontend --runTestsByPath src/app/runtime/__tests__/connectionRuntime.test.js
yarn test:frontend --runTestsByPath src/app/widgets/Grbl/__tests__/Grbl.test.jsx
yarn test:frontend --runTestsByPath src/app/widgets/Marlin/__tests__/Marlin.test.jsx
```

These tests mock `@app/lib/controller` or supply a runtime; they prove command
payloads, listener cleanup, partial-state merging, type filtering, and
connected/disconnected gating. They do not prove Socket.IO or server behavior.

## L1: simulator unit tests

```sh
yarn test grbl-simulator
```

The simulator tests require Jest globals; do not run
`node grbl-simulator/__tests__/*.test.js`. The fixture spies on `setInterval`
and clears only the timers it created, so keep production planner behavior
intact and do not weaken that cleanup to make a test pass.

## L2: TCP simulator integration

```sh
# terminal 1
cd grbl-simulator && node grbl-server.js 5000

# terminal 2
cd grbl-simulator && node test-client/main.js 5000 motion
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

## L3: browser integration

Run against an already-running app and an isolated local backend with a
task-owned configuration and watch directory; `cncjs-workspace` owns the E2E
setup and fixture contract.

```sh
yarn test:e2e visualizer
yarn test:e2e all --grep "simulator:"
```

`visualizer` includes `simulator.spec.mjs`, which spawns the real
`grbl-simulator/grbl-server.js` on an ephemeral loopback port, connects the
real app through Socket.IO, records `E2E RT:`/`CMD:` output, and terminates the
simulator afterward. Controller snapshot scenarios (`controllers.spec.mjs`)
publish Marlin/Smoothie/TinyG state through an isolated Socket.IO fixture;
they exercise UI rendering, not controller execution.

The fixture and guard contract — approved loopback identity, command
allowlist, and fail-closed Socket.IO guard — is owned by `cncjs-workspace`;
read that skill before changing or debugging those specs. Neither scenario
uses physical hardware.

## Reporting

Report the highest level actually exercised and the boundary it covered.
Simulator output is not physical machine behavior.
