---
name: cncjs-workspace
description: Use when changing CNCjs workspace widgets, layout, widget configuration/state, or their browser behavior in this checkout, including checks across the local config store and Socket.IO boundaries; not for controller-only protocol work.
metadata:
  version: "1.0.0"
  source: "local-repository"
---

# CNCjs workspace and widget changes

Owns the workspace shell, the widget registry and host anchors, layout and
config persistence, widget lifecycle, and manual browser checks. A workspace
change is not complete when the component renders: layout, widget
configuration, controller state, and commands cross React, the local config
store, Socket.IO, and the server. Verify each boundary the change actually
touches.

Controller command/state contracts, protocol bytes, and state normalization
belong to `cncjs-controller`; localized strings to `cncjs-i18n`. This checkout
has no browser test runner; read the verification reference before choosing
checks.
Source paths are repository-relative; reference links are skill-relative.

## Safety bottom lines

- Never point a development instance at a shared or production server, a real
  serial port, physical hardware, or a camera. Use a task-owned local instance
  with a task-owned config file and watch directory, and the repository
  simulator. Do not use `~/.cncrc`, a plain `yarn dev` server, or a shared
  serial path for validation.
- This checkout has no Playwright or e2e suite. Do not claim one exists or
  describe manual browser observation as an automated test.
- Persisted workspace state is local (`localStorage.cnc` or the Electron user
  config), not server state. Do not send workspace layout to a server API.
- Do not add retries, disable guards, or loosen assertions to make a manual
  check pass.
- Do not add serial-port, camera, probe, or hardware integration tests.

## Route the work

Read only the references relevant to the task; read verification before
selecting or running checks.

| If the task changes | Read |
| --- | --- |
| registry and host anchors, layout, fork/remove, collapse/fullscreen, widget config and persistence, widget lifecycle, config normalization | [Layout and state](references/layout-and-state.md) |
| available tests, lint, manual browser checks, persistence checks, evidence reporting | [Verification](references/verification.md) |
| command names or payloads, controller state, protocol bytes | `cncjs-controller` skill |
| user-facing strings | `cncjs-i18n` skill |

Read the other skill's entry only when the change crosses that boundary; do not
duplicate its rules here.

## Minimum completion

1. Trace the path: registry and host, widget state, config persistence, then
   the server event or API if used. Decide whether the change is local-only or
   cross-boundary.
2. Read the nearest existing tests and reuse their patterns. There is no
   widget test suite; the only app component test is the Webcam test. Server
   controller tests cover the command/state boundary.
3. Prove local behavior with the available unit/component tests. Prove a
   cross-boundary change at the highest available level, usually the
   controller tests plus the in-process simulator; state what remains manual.
   A mocked controller or direct component instance cannot certify Socket.IO
   or server behavior.
4. Verify persistence by reloading, not by one successful click. For visual
   changes, review the running app at the sizes and states you changed.
5. Report the boundary exercised and the evidence kind: unit/component, mocked
   or captured, simulator, or manual browser/visual observation. Do not present
   a mock as simulator or execution evidence, and do not call a manual
   observation an automated browser test.

## Boundaries

- Do not add a second state or persistence mechanism.
- Keep JavaScript-only patterns, Stylus, and `i18n._` for user-facing strings.
- Finish edits before the manual check; Webpack HMR rebuilds the app, and there
  is no e2e runner to coordinate with.
- Keep controller protocol changes and release work in their own skills.
