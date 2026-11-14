---
name: cncjs-controller
description: Implement or verify CNCjs controller behavior across server controllers, runners, line parsers, the Socket.IO command/state boundary, and controller widgets. Use when changing Grbl, Marlin, Smoothie, or TinyG protocol handling, controller state, connection flow, widget command payloads, or simulator-backed controller tests.
metadata:
  version: "1.0.0"
  source: "local-repository"
---

# CNCjs controller and protocol work

Owns the server command-state contract and protocol safety: wire parsing,
runner state, command dispatch, the `CNCEngine` Socket.IO boundary, and the
exact payloads controller widgets must send. Workspace layout, widget lifecycle,
and browser checks belong to `cncjs-workspace`; user-facing strings to
`cncjs-i18n`; dependencies and releases to `cncjs-version`. This skill never
authorizes hardware access.
Source paths are repository-relative; reference links are skill-relative.

## Safety bottom lines

- Automated verification uses mocks, fixtures, or `grbl-simulator` only. Never
  require a physical controller, serial port, camera, or probe, and never use
  `socat` or a serial bridge in automated verification. Do not use a shared
  bridge, `~/.cncrc`, or a plain `yarn dev` server for validation.
- Do not bypass the controller `write`/`writeln` closed-connection guard
  (`isClose()`), or `CNCEngine`'s missing/closed-port guard, and do not weaken
  either to make a test pass.
- Realtime safety commands (`!`, `~`, `\x18`, `\x85`, override bytes) stay
  single-byte `write` calls; never queue them through the feeder or sender.
- Laser test never enables the laser without a motion mode, and always turns
  it off after a timed test.
- Grbl alarm keeps gating the feeder, and a streamed `error:` pauses the
  workflow unless `state.controller.exception.ignoreErrors` is set. Keep
  sender acknowledgments paired with `next()`.
- Do not silently change alarm/error meanings, realtime byte mappings, or the
  tool-change, autolevel, and reset/unlock sequences.

## Route the work

Read only the references relevant to the changed behavior, and read the
verification reference before choosing checks. Trace the implementation too;
references do not replace the code.

| If the task changes | Read |
| --- | --- |
| command names or payloads, feeder/sender behavior, `serialport:write` sources, controller state shape, connection identity, app unit normalization | [Contracts](references/contracts.md) |
| parser result order or payloads, Grbl status merging, realtime bytes vs line commands, laser/autolevel/tool-change/reset sequences | [Protocols](references/protocols.md) |
| selecting and running checks, or interpreting their evidence | [Verification](references/verification.md) |
| workspace rendering, layout, widget config/state, browser checks | `cncjs-workspace` skill |
| localized strings | `cncjs-i18n` skill |

Read the other skill's entry only when the change crosses that boundary; do not
duplicate its rules here.

## Minimum completion

1. Identify the controller, parser result class, runner event, controller
   state field, and every app consumer of that field.
2. Change the wire shape, parser, runner state, controller handler, and app
   consumer together. Touch constants only when the protocol itself changed.
3. Prove the changed behavior and relevant negative paths: unknown command,
   closed connection or missing port, alarm while feeding, malformed line,
   missing parameter, or another controller's report. App/server contract
   changes also require an integration scenario, not just separate unit mocks.
4. Report the highest level actually run. A mock, snapshot, or captured
   command is not simulator or execution evidence.

## Boundaries

- Do not add serial-port, camera, probe, or hardware integration tests.
- Do not edit `grbl-simulator` to accommodate a broken controller expectation
  unless the simulator is wrong relative to Grbl; fix the consumer instead.
- Do not introduce a second state-normalization path in a widget when the
  `Axes` widget already owns unit conversion.
- Keep localization, layout, and release work in their own skills.
