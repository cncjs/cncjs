---
name: cncjs-controller
description: Implement or verify CNCjs controller behavior across server controllers, runners, line parsers, the Socket.IO command/state boundary, and controller widgets. Use when changing Grbl, Marlin, Smoothie, or TinyG protocol handling, controller state, connection flow, widget command payloads, or simulator-backed controller tests.
metadata:
  version: "1.1.0"
  source: "local-repository"
---

# CNCjs controller and protocol work

Owns the app/server command-state contract and protocol safety: wire parsing,
runner state, command dispatch, the Socket.IO boundary, and the exact payloads
controller widgets must send. Workspace layout, widget lifecycle, and browser
fixtures belong to `cncjs-workspace`; user-facing strings to `cncjs-i18n`;
dependencies and releases to `cncjs-version`. `AGENTS.md` and `.omp/RULES.md`
still apply, and this skill never authorizes hardware access.
Source paths are repository-relative; reference links are skill-relative.

## Safety bottom lines

- Verify with mocks, fixtures, or the repository simulator only. NEVER require
  a physical controller, serial port, camera, or probe, and NEVER use `socat`
  or `/tmp/ttyGRBL` in automated verification; that bridge is a manual `yarn
  dev` convenience.
- Do not bypass the `controller.write` closed-connection guard or the
  service-engine's missing/closed-ident guard, and do not weaken either to
  make a test pass.
- Realtime safety commands (`!`, `~`, `\x18`, `\x85`, override bytes) stay
  single-byte `write` calls; never queue them through the feeder or sender.
- Laser test never enables the laser without a motion mode, and always turns
  it off after a timed test.
- Grbl alarm keeps gating the feeder, and a streamed `error:` pauses the
  workflow unless `ignoreErrors` is set. Keep sender acknowledgments paired
  with `next()`.
- Do not silently change alarm/error meanings, realtime byte mappings, or the
  tool-change, autolevel, and reset/unlock sequences.

## Route the work

Read only the references relevant to the changed behavior, and read the
verification reference before choosing checks. Trace the implementation too;
references do not replace the code.

| If the task changes | Read |
| --- | --- |
| command names or payloads, feeder/sender behavior, `connection:write` sources, controller state shape, app normalization, connection identity | [Contracts](references/contracts.md) |
| parser result order or payloads, Grbl status merging, realtime bytes vs line commands, laser/autolevel/tool-change/reset sequences | [Protocols](references/protocols.md) |
| selecting and running checks, or interpreting their evidence | [Verification](references/verification.md) |
| workspace rendering, layout, widget config/state, browser fixtures and guards | `cncjs-workspace` skill |
| localized strings | `cncjs-i18n` skill |

Read the other skill's entry only when the change crosses that boundary; do not
duplicate its rules here.

## Minimum completion

1. Identify the controller, parser result class, runner event, controller
   state field, and every app consumer of that field.
2. Change the wire shape, parser, runner state, controller handler, and app
   contract together. Touch constants only when the protocol itself changed.
3. Prove the changed behavior and relevant negative paths: unknown command,
   closed connection or missing ident, alarm while feeding, malformed line,
   missing parameter, or another controller's report. App/server contract
   changes also require an integration scenario, not just separate unit mocks.
4. Report the highest level actually run. A mock, snapshot, or captured
   command is not simulator or execution evidence.

## Boundaries

- Do not add serial-port, camera, probe, or hardware integration tests.
- Do not edit `grbl-simulator` to accommodate a broken controller expectation
  unless the simulator is wrong relative to Grbl; fix the consumer instead.
- Do not introduce a second state-normalization path in a widget when the
  reducer or Visualizer already owns it.
- Keep localization, layout, and release work in their own skills.
