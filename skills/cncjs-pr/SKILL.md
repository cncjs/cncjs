---
name: cncjs-pr
description: Draft CNCjs commit messages, pull request titles and descriptions, and Changesets entries. Use when the user mentions a PR, pull request, merge request, commit message, release note, or changeset, or provides a diff and asks how to describe it.
metadata:
  version: "1.0.0"
  source: "local-repository"
---

# CNCjs PR and changeset conventions

Use this skill to prepare commit messages, PR descriptions, and changesets from
the actual diff. It does not choose the implementation or authorize publishing.
Source paths are repository-relative; reference links are skill-relative.

## Baseline and authorization

- Inspect the actual diff, recent history, and relevant `.changeset/` entries.
  Do not describe work from a user summary alone.
- Identify the change type, intended PR target, published-package impact,
  breaking changes, and verification actually performed. Read the current
  checkout's configuration and workflows; do not infer or silently retarget it.
- Commit, push, PR or label updates, workflow dispatch, and publishing require
  the user's explicit authorization for that action. Drafting text does not
  grant that permission.
- Do not hand-edit generated versions, changelogs, lockfiles, or release
  metadata, or delete changesets to alter a release.
- Report observed checks only. Mocks, snapshots, and simulator runs are not
  physical-controller verification.

## Route by task

Read the matching reference before drafting; combine routes for a PR that also
needs a changeset. Do not load unrelated implementation procedures just to
describe an already-verified change.

| When the task involves | Read |
| --- | --- |
| Commit subject, PR title, PR references, or PR body | [Pull requests](references/pull-requests.md) |
| Deciding whether a changeset is needed, naming, format, or bump type | [Changesets](references/changesets.md) |
| Performing version or release maintenance, rather than drafting its description | `cncjs-version` |
| Implementing or verifying controller, widget, or translated behavior | `cncjs-controller`, `cncjs-workspace`, or `cncjs-i18n` as applicable |

## Completion

- Text matches the actual change, with no invented results, links, or CI claims.
- Breaking changes include migration guidance.
- Published-package changes carry the appropriate changeset; docs-only,
  test-only, CI-only, and internal work do not.
- State any unverified behavior. Do not perform unauthorized repository or
  external writes.
