# Controller contracts: commands, state, and connection

Read the implementation before changing a contract; this file maps the
contract, the code is authoritative.

## Where the contract lives

| Area | Files |
| --- | --- |
| Server controllers | `src/server/controllers/{Grbl,Marlin,Smoothie,TinyG}/<Type>Controller.js` |
| Parsers and runners | `<Type>LineParser.js`, `<Type>LineParserResult*.js`, `<Type>Runner.js` |
| Shared builtin/write-source constants | `src/server/controllers/constants.js` |
| Grbl wire constants, realtime list, alarms, settings | `src/server/controllers/Grbl/constants.js` |
| Socket.IO boundary | `src/server/services/cncengine/CNCEngine.js` |
| App socket client | `src/app/lib/controller/Controller.js`, `src/app/lib/controller/index.js` |
| App connection UI and config | `src/app/widgets/Connection/index.jsx` |
| App unit normalization | `src/app/widgets/Axes/index.jsx` |
| Controller widgets | `src/app/widgets/{Grbl,Marlin,Smoothie,TinyG}/` |
| Simulator | `grbl-simulator/grbl-simulator.js`, `grbl-server.js`, `test-client/` |

## Data flow

Commands:

```
widget
  -> controller.command(cmd, ...args)              app socket client
  -> Socket.IO "command" (port, cmd, ...args)      CNCEngine
  -> controller.command(cmd, ...args)              server
  -> command handler -> Feeder / Sender / connection.write
```

Telemetry and state:

```
connection "data"
  -> runner.parse(line)
  -> typed runner event
  -> controller state/settings update
  -> controller.emit("controller:state" | "controller:settings", type, value)
  -> Socket.IO to registered sockets
  -> app Controller listeners -> widget setState
```

`serialport:read` and `serialport:write` are console/terminal text, not state.
The app may also attach direct listeners such as the `Axes` widget's
`controller:state` handler; do not create a second, divergent unit conversion.

## Connection identity

`src/server/services/cncengine/CNCEngine.js` keys controllers by the serial
port path in the server store:

- `open` reuses `store.get('controllers["<port>"]')` and calls
  `addConnection(socket)`; otherwise it constructs the controller from
  `controllerType`, opens it, stores it under `controllers["<port>"]`, and has
  the socket join the room named by the port.
- `close` leaves the room, closes the controller, unsets the store entry, and
  destroys the controller.
- `command`, `write`, and `writeln` are dropped when the controller is missing
  or `controller.isClose()`.
- `addConnection` emits the current `serialport:open`, `controller:settings`,
  `controller:state`, feeder, sender, `gcode:load` (when a program is loaded),
  and workflow snapshots, so a late client does not need a refresh command.
  `Grbl:settings`/`Grbl:state` remain as backward-compatible emits.

On the app side, `src/app/lib/controller/Controller.js` is the connection
authority. `serialport:open` sets `port` and `type`; `serialport:close` clears
port, type, state, settings, and workflow state. Its `command`, `write`, and
`writeln` are no-ops until `port` is set. Do not reimplement this gating in a
widget or bypass it with a raw socket client.

## Widget command contract

Widgets must pass the exact payload the server expects. Connected-state and
controller-type gating plus listener cleanup are widget lifecycle concerns
owned by `cncjs-workspace`. Examples from the current widgets:

- The Grbl status report control uses `controller.write('?')`; line commands
  use `controller.writeln('$C')`, `'$'`, `'$$'`, `'$#'`, `'$G'`, `'$I'`, or
  `'$N'`; controller actions use `controller.command('homing' | 'unlock' |
  'sleep')`.
- The Grbl overrides send `feedOverride` with `-10`, `-1`, `1`, `10`, or `0`;
  `spindleOverride` with the same values; and `rapidOverride` with `100`, `50`,
  or `25`.
- Axes jogging sends the `G91`, `G0`/`G1`, `G90` sequence through `gcode`.

There is no widget test suite in this checkout, so widget code proves intent
only, not protocol delivery. The server tests in
`src/server/controllers/Grbl/__tests__/GrblController.test.js` assert the exact
override bytes and the feeder/sender channels.

## Command surface

Canonical commands are the keys of each controller's `command()` handler map.
Shared commands include:

- `feedhold`, `cyclestart`, `statusreport`, `homing`, `sleep`, `unlock`,
  `reset`, `jogCancel`
- `feedOverride`, `spindleOverride`, `rapidOverride` with the exact values
  handled by each controller
- `lasertest:on` with `(power, duration, maxS)` and `lasertest:off`
- `gcode` with a string or array of lines, plus optional context
- `gcode:load` with `(name, gcode, context?, callback)`, `gcode:unload`,
  `gcode:start`, `gcode:pause`, `gcode:resume`, and `gcode:stop` with optional
  `{ force }`
- `feeder:feed`, `feeder:start`, `feeder:stop`
- `macro:load`, `macro:run`, `watchdir:load`
- `autolevel:start`, `autolevel:stop`, `autolevel:getProbeState`,
  `autolevel:applyProbeCompensation`, `autolevel:loadFromFile`,
  `autolevel:saveToFile`

The deprecated `start`, `stop`, `pause`, and `resume` aliases log a warning and
forward to the `gcode:*` command. Do not add new callers for them.

`gcode` feeds the Feeder line by line. `gcode:load` goes through the Sender and
appends a `%wait` dwell so the planner drains before completion. `%wait`
becomes a `G4 P...` line and holds the sender. `%msg` and `%<assignment>`
(for example `%_x=posx`) are handled by the feeder/sender filters. `M0`/`M1`
pause, and `M6` follows the configured tool-change policy.

## Controller state

`GrblRunner.state` is the canonical server shape:

```js
{
  status: {
    activeState, subState, mpos: { x, y, z, a, b, c },
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

App-side normalization lives in the `Axes` widget, not in a Redux reducer:

- Grbl positions are converted from inches to millimetres when the singleton
  `controller.settings.settings.$13 > 0`.
- Smoothie positions are converted when modal units are `G20`.
- Marlin positions are treated as millimetres.
- TinyG machine position (`sr.mpos`) is treated as millimetres; work position
  (`sr.wpos`) is converted when modal units are `G20`.
- Units come from `parserstate.modal.units` (`G20`/`G21`), falling back to the
  widget's current units.

Controller widgets render the reported state directly: Grbl reads
`status.activeState`, TinyG reads `sr.machineState`, and each widget ignores
`controller:state` reports for another controller type. Do not add a second
conversion in a display component.

Marlin position and temperature reports are merged server-side in
`MarlinRunner`: `pos` merges into `state.pos`, and temperature merges
`extruder`, `heatedBed`, and `hotend` before emitting. The Marlin widget stores
the latest `controller:state` payload as given; do not add a second merge in the
widget.
