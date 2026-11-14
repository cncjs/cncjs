---
name: cncjs-workspace
description: Use when changing CNCjs workspace widgets, layout, widget configuration/state, or their browser behavior, including integration checks across Socket.IO and HTTP boundaries; not for controller-only work with no workspace impact.
metadata:
  version: "1.1.0"
  source: "local-repository"
---

# CNCjs workspace and widget changes

Owns the workspace shell, widget registry, layout and config persistence, and
browser fixtures and guards. A workspace change is not complete when the
component renders: layout, widget configuration, controller state, and commands
cross React, the local config store, Socket.IO, and the server. Verify each
boundary the change actually touches.

Controller command/state contracts, protocol bytes, and state normalization
belong to `cncjs-controller`; localized strings to `cncjs-i18n`. Read
`test/e2e/README.md` before browser verification.
Source paths are repository-relative; reference links are skill-relative.

## Safety bottom lines

- Run browser tests against a local, task-owned CNCjs instance with an isolated
  config and watch directory. Never use a shared or production server, a real
  serial port, physical hardware, or a camera.
- Keep the Socket.IO and API guards fail-closed and scoped to the approved
  loopback simulator. Never widen an allowlist to wildcards or another
  controller, and never add a page route for `/socket.io`.
- Never send unapproved writes to a running server. Runtime-modal feeder events
  use their own private local Socket.IO server; actual command execution uses
  only the approved simulator identity and guard allowlist.
- Do not add retries or disable guards, uncaught-error checks, or assertions to
  get a green run. One worker and zero retries are intentional.
- Credentials belong in `E2E_USERNAME`/`E2E_PASSWORD` only, sign-in is
  localhost-only, and traces, reports, and screenshots are never committed.

## Route the work

Read only the references relevant to the task; read browser verification before
selecting or running browser checks.

| If the task changes | Read |
| --- | --- |
| registry, shell/host anchors, layout, fork/remove, collapse/fullscreen, widget config and persistence, widget lifecycle, config normalization | [Layout and state](references/layout-and-state.md) |
| browser fixtures and selectors, persistence assertions, commands, cross-boundary Socket.IO/API checks, theme and visual review, guard scope, e2e commands | [Browser verification](references/browser-verification.md) |
| command names or payloads, controller state, protocol bytes | `cncjs-controller` skill |
| user-facing strings | `cncjs-i18n` skill |

Read the other skill's entry only when the change crosses that boundary; do not
duplicate its rules here.

## Minimum completion

1. Trace the path: registry and host, widget state, config persistence, then
   the server event or API if used. Decide whether the change is local-only or
   cross-boundary.
2. Read the nearest existing tests and reuse their fixtures, selectors, and
   state assertions.
3. Prove local behavior with unit tests, and prove a cross-boundary change with
   at least one integration scenario. A mocked controller or mocked HTTP
   response cannot certify a cross-boundary change.
4. Verify persistence by reloading, not by one successful click. For visual
   changes, review screenshots in both themes.
5. Report the boundary exercised and the evidence kind: unit/component, mocked
   or captured, simulator execution, or visual review. Never present a mock as
   execution.

## Boundaries

- Do not add a second state or persistence mechanism.
- Keep JavaScript-only patterns, Stylus, and `i18n._` for user-facing strings.
- Finish edits before browser verification; the e2e runner does not rebuild the
  app.
- Keep controller protocol changes and release work in their own skills.
