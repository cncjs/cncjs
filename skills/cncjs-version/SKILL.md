---
name: cncjs-version
description: Maintain CNCjs versions, dependencies, runtime support, and releases. Use when asked to bump a version, cut or verify a release, update Node.js support or packaged architectures, change Yarn dependencies, or explain which files and workflows own those changes.
metadata:
  version: "1.0.0"
  source: "local-repository"
---

# CNCjs version and release maintenance

Use this skill for dependency, package-version, runtime-support, packaging, and
release maintenance, not feature implementation. Repository tooling owns
generated versions, changelogs, tags, packages, and images.
Source paths are repository-relative; reference links are skill-relative.

## Baseline and authorization

- Publish, tag, push, deploy, artifact upload, Docker push, and GitHub releases
  require the user's explicit authorization for that exact action.
- Never run publish commands as a verification step.
- Do not hand-edit generated package versions, `src/package.json`, changelog
  release sections, `yarn.lock`, or release metadata. Do not change release
  branch policy without an explicit release-process decision.
- Never restate Node.js version numbers in skills. Read `package.json`
  `engines.node` and the README supported-versions table as the sources of truth.
- Use the pinned Yarn tooling and the owning generation or release workflow,
  not remembered versions or manual edits.

## Route by task

Read the matching reference before changing files; combine routes only when the
change spans responsibilities.

| When the task involves | Read |
| --- | --- |
| Yarn dependencies, lockfile, `package-sync`, or `packageExtensions` | [Dependencies](references/dependencies.md) |
| Release branch policy, versioning flow, release PR, or release troubleshooting | [Release](references/release.md) |
| Node.js support, desktop architectures, container runtime, or packaged artifacts | [Runtime and packaging](references/runtime-and-packaging.md) |
| Preparing PR text or a changeset rather than performing release maintenance | `cncjs-pr` |

## Completion

- Check affected sources agree: root package metadata, generated
  `src/package.json`, simulator engines, Dockerfile, CI runtime matrices, and
  README support tables as applicable. Release notes come from changesets.
- User-visible support, packaging, or shipped-dependency changes have a
  changeset explaining the reason.
- Run checks appropriate to the changed boundary and report their observed
  results. Do not imply CI, release, or artifact verification that did not run.
- No external release action was performed without authorization.
