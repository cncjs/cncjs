# Controller contracts: commands, state, and connection

Read the implementation before changing a contract; this file maps the
contract, the code is authoritative.

## Where the contract lives

| Area | Files |
| --- | --- |
| Server controllers | `src/server/controllers/{Grbl,Marlin,Smoothie,TinyG}/<Type>Controller.js` |
| Parsers and runners | `<Type>LineParser.js`, `<Type>LineParserResult*.js`, `<Type>Runner.js` |
| Command names and write sources | `src/server/controllers/constants.js` |
| Grbl wire constants, modal groups, alarms, settings | `src/server/controllers/Grbl/constants.js` |
| Socket.IO boundary | `src/server/service-engine.js` |
| App socket client | `src/app/lib/CNCJSController.js`, `src/app/lib/controller.js` |
| App connection state | `src/app/runtime/connectionRuntime.js`, `src/app/hooks/useConnection.js` |
| App state pipeline | `src/app/sagas/controller/index.js`, `src/app/reducers/controller.js` |
| Controller widgets | `src/app/widgets/{Grbl,Marlin,Smoothie,TinyG}/` |
| Simulator | `grbl-simulator/grbl-simulator.js`, `grbl-server.js`, `test-client/` |

## Data flow

Commands:

```
widget / useConnection
  -> controller.command(cmd, ...args)            app socket client
  -> Socket.IO "command" (ident, cmd, ...args)   service-engine
  -> controller.command(cmd, ...args)            server
  -> commandHandler -> Feeder / Sender / connection.write
```

Telemetry and state:

```
connection "data"
  -> runner.parse(line)
  -> typed runner event
  -> controller state/settings update
  -> controller.emit("controller:state" | "controller:settings", type, value)
  -> Socket.IO to registered sockets
  -> app listeners -> saga -> Redux reducer -> widgets
```

`connection:read` and `connection:write` are console/terminal text, not state.
The app may also attach direct listeners such as the Visualizer's
`controller:state` handler; do not create a second, divergent unit conversion.

## Connection identity

`src/server/service-engine.js` derives the controller key from connection
options:

- serial: `serial|<path>|<baudRate>`
- socket: `socket|<host>:<port>`

The string is hex-encoded and used as `controllers[ident]`. `open` reuses an
existing controller and calls `addSocket`; otherwise it constructs, opens, and
stores one. `command`, `write`, and `writeln` are dropped when the ident is
missing or the controller is closed. `addSocket` emits the current
`controller:type`, `connection:open`, `controller:settings`,
`controller:state`, feeder, sender, and workflow snapshots, so a late client
does not need a refresh command.

On the app side, `src/app/runtime/connectionRuntime.js` is the connection
authority. It keeps a snapshot, rejects a second open/close while one is
pending, times out an unconfirmed request, and lets a late server
`connection:open`/`connection:close` event win over a local timeout. Its
`command`, `write`, and `writeln` are no-ops until the snapshot has an ident.
`useConnection` exposes that snapshot and those actions. Do not reimplement
this gating in a widget or bypass it with the raw socket client.

## Widget command contract

Widgets must pass the exact payload the server expects; connected-state and
controller-type gating plus listener cleanup are widget lifecycle concerns
owned by `cncjs-workspace`. The Grbl widget test asserts the full override
sequence, for example `['feed_override', -10]` through `['feed_override', 0]`,
and `['rapid_override', 25]`/`50`/`100`; the status report control uses
`controller.write('?')`, while line commands use `writeln`. Widget tests mock
`@app/lib/controller`, so they prove intent only, not protocol delivery.

## Command surface

Canonical commands are the `CONTROLLER_COMMAND_*` values in
`src/server/controllers/constants.js`, for example:

- `feed_hold`, `cycle_start`, `homing`, `sleep`, `unlock`, `reset`,
  `jog_cancel`
- `feed_override`, `rapid_override`, `spindle_override` with the exact values
  handled by each controller
- `laser_test` with `(power, duration, maxS)`
- `gcode` with a string or array of lines, plus optional context
- `sender_load` with `{ name, content }`, plus context and callback
- `sender_unload`, `sender_start`, `sender_pause`, `sender_resume`,
  `sender_stop` with optional `{ force }`
- `feeder_start`, `feeder_stop`
- `macro_load`, `macro_run`, `watchdir_load`
- `autolevel:start`, `autolevel:stop`, `autolevel:getProbeState`,
  `autolevel:applyProbeCompensation`, `autolevel:loadFromFile`,
  `autolevel:saveToFile`

Deprecated aliases such as `gcode:load`, `gcode:start`, `jogCancel`,
`feedOverride`, `lasertest:on`, and `watchdir:load` are translated in
`src/server/controllers/utils/index.js` and log a warning. Do not add new
callers for them.

`gcode` feeds the Feeder line by line. `sender_load` goes through the Sender and
appends a `%wait` dwell so the planner drains before completion. `%wait`
becomes a `G4 P...` line and holds the sender. `%msg` and `%<assignment>`
(for example `%_x=posx`) are handled by the feeder/sender filters. `M0`/`M1`
pause, and `M6` follows the configured tool-change policy.

## Controller state

`GrblRunner.state` is the canonical server shape:

```js
{
  status: {
    machineState, subState, mpos: { x, y, z, a, b, c },
    wpos: { x, y, z, a, b, c }, wco, ov: [],
    buf: { planner, rx }, pinState, accessoryState
  },
  parserstate: {
    modal: { motion, wcs, plane, units, distance, feedrate, program, spindle, coolant },
    tool, feedrate, spindle
  }
}
```

`GrblRunner.settings` is `{ version, parameters, settings }`. The runner emits
every parsed result but replaces `state`/`settings` only when the relevant
subtree changes; the controller copies the new object and emits
`controller:state`/`controller:settings` on reference change.

App reducer rules that must remain consistent with the server:

- Grbl positions are converted from inches to millimetres when `$13 > 0`.
- Smoothie positions are converted when modal units are `G20`.
- Marlin and TinyG positions are treated as millimetres.
- Grbl, Smoothie, and TinyG machine states map to `IDLE`, `RUN`, `HOLD`,
  `ALARM`, or `NA`; Grbl states are `Idle`, `Run`, `Hold`, `Alarm` (plus
  `Door`, `Home`, `Sleep`, `Check`). Marlin keeps its raw `machineState` and
  reports no reformed state.
- `controller:state` replaces the controller state; Marlin widget tests also
  require partial reports to merge without erasing heater data, and reports for
  another controller type to be ignored.
