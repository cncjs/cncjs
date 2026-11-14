# Protocol rules and safety sequences

Wire shapes, byte mapping, and the execution sequences that must not be
reordered. Changing any of these changes a contract shared by server tests,
app widgets, and the simulator.

## Parsers

Each `<Type>LineParser` tries an ordered list of result classes. The first
non-null result wins and receives `payload.raw`. On no match, Grbl, Marlin,
and Smoothie return `{ type: null, payload: { raw } }`; TinyG additionally
sets `payload.f` to the input footer or `[]`. A parser must match its exact
wire shape, not a family of loosely similar lines.

Grbl order: status, `ok`, `error:`, `ALARM:`, parser state, parameters, help,
version, options, echo, feedback, settings, startup. Important payloads:

- status: `activeState`, numeric `subState`, `mpos`, `wpos`, `wco`, `ov`,
  `buf`, `pinState`, `accessoryState`
- parser state: `modal`, `tool`, `feedrate`, `spindle`
- parameters: `[G54:...]`, `[TLO:...]`, `[PRB:x,y,z:result]`
- settings: `$n=value (message)`
- feedback: `[MSG:...]`
- startup: `Grbl 1.1h ['$' for help]`

Grbl status merging has two explicit invariants in `GrblRunner`:

- a status report without `Pn:` clears `pinState`, because Grbl omits the field
  when no pin is active;
- an `Ov:` report without `A:` clears `accessoryState`; a report without `Ov:`
  keeps the previous accessory snapshot.

When only `MPos` or only `WPos` is present, the runner derives the other from
`WCO`. Do not re-derive positions in a widget when the runner already did it.

Other controllers:

- Marlin lines: startup, `FIRMWARE_NAME:...`, `X:... Y:... Z:... E:...`,
  `echo:`, `Error:...`, temperature `ok T:... B:...`, `ok`, `ok N10 P15 B3`.
- Smoothie lines: `<...>` status, `ok`, `error:`, `action:`, `ALARM:`,
  parser state, parameters, build version.
- TinyG lines are JSON objects; the parser adds `payload.f` as the footer and
  the runner emits short event names such as `sr`, `qr`, `sys`, `ov`, `r`, `f`.

## Grbl realtime bytes versus line commands

The Grbl protocol requires realtime commands as single bytes with no newline.
Current handlers pass one-character strings to `write`, outside the
feeder/sender. `SerialConnection` forwards the strings to `port.write` without
specifying an encoding; fake-connection tests capture strings, not serialized
bytes. In particular, do not claim extended characters `\x80-\xff` reach the
wire as single bytes without verifying the transport encoding using mocks:

| Operation | Byte |
| --- | --- |
| Status query | `?` |
| Feed hold | `!` |
| Cycle start / resume | `~` |
| Soft reset | `\x18` |
| Jog cancel | `\x85` |
| Feed override reset / +10 / -10 / +1 / -1 | `\x90` / `\x91` / `\x92` / `\x93` / `\x94` |
| Rapid override 0 or 100 / 50 / 25 | `\x95` / `\x96` / `\x97` |
| Spindle override reset / +10 / -10 / +1 / -1 | `\x99` / `\x9a` / `\x9b` / `\x9c` / `\x9d` |

Line commands go through `writeln` or the feeder/sender: `$H`, `$SLP`, `$X`,
`$$`, `$#`, `$G`, `$I`, `$N`, `$C`. `writeln` appends `\n` only for
non-realtime input; it passes the realtime list and input containing a
character in `\x80-\xff` unchanged to `write` at the controller boundary.

`controller.write` emits `serialport:write` with `source: client` before
writing. Feeder output emits `serialport:write` with `source: feeder`. Sender
output writes directly to the connection without that event, so a test that
only inspects `serialport:write` does not see streamed program lines; assert
the fake connection's recorded writes for those.

## Safety sequences

These are behavioral contracts, not style preferences.

- **Alarm gate.** Grbl alarm is a feeder gate: `feeder.on('data')` resets the
  feeder and stops sending while `runner.isAlarm()`. Alarm does not by itself
  clear the sender or workflow. If a change needs motion stopped, stop the
  workflow explicitly and verify it.
- **Grbl streamed error.** An `error:` during a running workflow pauses the
  workflow unless `state.controller.exception.ignoreErrors` is set. Keep the
  sender acknowledgment and `next()` calls paired; otherwise streaming stalls.
- **Grbl realtime safety commands.** `!`, `~`, `\x18`, `\x85`, and the override
  bytes must stay realtime bytes, never queued through the feeder/sender. Other
  protocols differ: TinyG sends `!` and `~` using `writeln` and feeds override
  commands through `gcode`. Do not transplant Grbl's byte rules to TinyG.
- **Laser test.** Grbl queues `G1F1` before `M3S...`; for a positive duration
  it adds `G4P...` and `M5S0`, and `lasertest:off` queues `M5S0`. TinyG queues
  `M3S...`, a positive-duration `G4P...`, and `M5S0`; Marlin queues `M3S...`,
  then `G4 P...` and `M5` for a positive duration, and writes `M5` for off.
  Smoothie writes `M3` and `fire <power>`, followed for a positive duration by
  `G4P...`, `fire off`, and `M5`; off writes the last two commands. Smoothie's
  source notes that the `P` dwell units depend on `grbl_mode`. Do not assume
  non-Grbl handlers establish a motion mode, or that an off command proves
  execution. Preserve the affected controller's sequence.
- **Autolevel.** Test mode issues one probe at the current XY; full mode
  initializes and probes a generated grid. Grbl and Smoothie consume `PRB`
  reports, Marlin captures an `M114` position, and TinyG consumes a JSON
  `prb` response. Each associates a successful measurement with the next
  intended grid node by recorded-position count, storing the node's XY and
  measured Z, not the nearest reported XY. `autolevel:stop` invokes that
  controller's reset and clears probe state; do not merely clear the arrays.
- **Manual tool change.** Preserve the affected controller's policy-specific
  sequence. For Grbl, retain the `%wait`, `M5`, `G90`, and `G53` moves,
  the prompt, and restoration of position and spindle state.
- **Grbl reset and unlock.** `reset` stops the workflow, resets the feeder, and
  writes `\x18`. `unlock` writes `$X`; it is not a substitute for homing after
  a lost position. Other controllers' reset and unlock behavior differs.
