# Protocol rules and safety sequences

Wire shapes, byte mapping, and the execution sequences that must not be
reordered. Changing any of these changes a contract shared by server tests,
app widgets, and the simulator.

## Parsers

Each `<Type>LineParser` tries an ordered list of result classes. The first
non-null result wins and receives `payload.raw`; no match returns
`{ type: null, payload: { raw } }`. A parser must match one exact wire shape,
not a family of loosely similar lines.

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

Grbl realtime commands are single bytes with no newline. Send them with
`write`, not `writeln` or the feeder/sender:

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
non-realtime input; the realtime list and any byte in `\x80-\xff` are written
unchanged.

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
- **Streamed error.** An `error:` during a running workflow pauses the workflow
  unless `state.controller.exception.ignoreErrors` is set. Keep the sender
  acknowledgment and `next()` calls paired; otherwise streaming stalls.
- **Realtime safety commands.** `!`, `~`, `\x18`, `\x85`, and the override bytes
  must stay realtime bytes. Never queue them through the line-based
  feeder/sender.
- **Laser test.** It must never turn on without a motion mode. The current
  sequence sends `G1F1` before `M3S...`; a timed test adds `G4P...` and then
  `M5S0`, and `lasertest:off` sends `M5S0`.
- **Autolevel.** Test mode probes once at the current XY; full mode probes the
  generated grid and records `PRB` results at the nearest intended node.
  `autolevel:stop` resets the machine and clears probe state; do not merely
  clear the arrays.
- **Manual tool change.** It must preserve and restore spindle state and
  position, wait for the planner, move to the tool-change position, and then
  prompt before continuing. Keep the `%wait`, `M5`, `G90`, `G53` sequence and
  the final spindle restore intact.
- **Reset and unlock.** `reset` stops the workflow, resets the feeder, and
  writes `\x18`. `unlock` writes `$X`; it is not a substitute for homing after
  a lost position.
