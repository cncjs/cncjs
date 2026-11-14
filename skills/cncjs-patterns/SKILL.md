---
name: cncjs-patterns
description: Apply CNCjs repository architecture and development conventions. Use when locating code, changing a frontend container, shared component, widget, server API, service, or test, or deciding which specialized CNCjs skill applies.
metadata:
  version: "1.0.0"
  source: "local-repository"
---

# CNCjs patterns

Use this skill for general architecture and development decisions, not as a
replacement for the controller, workspace, localization, or release procedures.
Source paths in this skill and its references are repository-relative.

## Baseline

- Read `CLAUDE.md` for the stack, commands, and repository conventions; read
  `CONTRIBUTING.md` for contribution and localization guidance.
- This checkout uses React 15.6 class components and Stylus. Reuse the owning
  component, store, API, service, or controller flow. Do not introduce a second
  component, state, or API architecture alongside the existing one.
- Never claim unrun checks or treat mocks as execution evidence. Tests must not
  connect physical machines or modify a user's running server.

## Route by task

Read only the references and specialized skills required by the affected area.
Reference links are relative to this skill directory.

| When the task involves | Read before editing |
| --- | --- |
| Containers, shared components, application state, or the API client | [Frontend patterns](references/frontend.md) |
| API handlers, services, server settings, or route registration | [Server patterns](references/server.md) |
| Selecting, adding, or changing tests and repository checks | [Testing](references/testing.md) |
| Widget layout, lifecycle, persistence, or workspace interaction | `cncjs-workspace` |
| Controller protocols, command/state contracts, or their app consumers | `cncjs-controller` |
| User-facing strings, translation updates, or localization validation | `cncjs-i18n` |
| Commit messages, PR descriptions, or changesets | `cncjs-pr` |
| Dependencies, package versions, runtime support, or release maintenance | `cncjs-version` |

Cross-area changes use the relevant routes together; a UI-only change does not
require reading the server or release procedures.

## Completion

Trace affected callers and boundaries, update the owning implementation and
tests, and run the narrowest meaningful checks. Report the observed result and
any unverified boundary. Use the specialized skill's completion criteria when
the change touches its area.
