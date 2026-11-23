# Changesets

The published package is `cncjs`. `src/package.json` describes the desktop app,
not a second Changesets package; `yarn package-sync` updates only selected
fields in that manifest. See `cncjs-version` for the synchronization boundary.

## When to propose a changeset

Recommend a changeset for a user-visible feature, fix, dependency, support, or
packaging change. Assess the delivered effect rather than only the paths changed:
a CI-only change can alter desktop or container release artifacts even when it
does not change the npm package. Docs, tests, CI, and internal changes with no
effect on users or delivered artifacts generally need no release note. Skill
edits with no such effect need no changeset.

The impact and bump guidance are not enforced by automation. Inspect the
current `.changeset/` entries, relevant history, and release PR when deciding.
`CONTRIBUTING.md` describes the PR-first submission sequence; the
`cncjs-version` skill owns release automation and generated files.

## Recommendation, draft, or file

- **Recommendation:** State whether the change needs a changeset and why.
- **Draft:** Return the complete Markdown content without writing a file.
- **File creation:** Write only when explicitly requested and the PR already
  exists with a verified number. Inspect existing entries first; do not
  duplicate the same logical change.

If there is no verified number, provide the content draft and state why no
file was created. Do not create a placeholder or open a PR just to get a
number. For an independently authorized PR that needs a changeset, open
the PR without it, then add the numbered file on the same branch if requested.
This follows the PR-first timing used by Tonic UI and Tonic One; their file
naming and one-file limit do not apply to CNCjs.

Use `.changeset/cncjs-pr-<number>.md` for a single entry. For separate logical
changes in the same PR, use `.changeset/cncjs-pr-<number>-<slug>.md` for
additional entries; keep any existing valid entry as is.

For example, `.changeset/cncjs-pr-1028-color-mode.md` and
`.changeset/cncjs-pr-1028-browser-workspace-storage.md` are historical numbered
entries for distinct changes. Random generator names and unnumbered slugs are
not the convention for new files. Do not rename valid historical entries.

## Format

```markdown
---
"cncjs": patch
---

fix(api): reject a watch-directory name containing a path component

The handler now refuses a name with directory components instead of stripping
it, so the operation cannot escape the watched directory. The response is 400
and no file is written.
```

- Use the published package name and intended bump type in the frontmatter.
- Write for users of the release: state what changes for them. Do not copy
  the PR's test log or internal implementation checklist into the changelog.
- Write a clear release-note summary and, where helpful, explain the reason and
  any compatibility or migration consequence.
- Several existing entries start with a conventional-commit summary, but
  `.changeset/cncjs-pr-1002-scan-patterns.md` starts with ordinary prose.
  Neither conventional syntax nor an exact match to the PR title is required.

## Bump type

This is an assessment aid, not an enforced rule. Recent entries use `patch`
for both fixes and new features, while the runtime-support removal uses `minor`.
Inspect current practice and the intended release line rather than inferring the
bump solely from a `feat` or `fix` prefix.

| Bump | Consider for |
| --- | --- |
| `patch` | Fixes and compatible changes; existing feature entries also use it |
| `minor` | Significant compatible features or support changes, subject to the release plan |
| `major` | Breaking public APIs or configuration requiring migration; confirm the intended release line |

Release versions and `CHANGELOG.md` sections are generated from these entries by
Changesets. Do not hand-edit `package.json` versions, generated changelog
sections, or delete changesets in a feature PR; see `cncjs-version`.

## Completion checklist

- [ ] Changeset impact and bump were assessed against the actual change and
      release plan, including any affected release artifacts.
- [ ] Any file was requested, uses a verified existing PR number and the
      published package, and does not duplicate an existing entry.
- [ ] No version, changelog, lockfile, or release metadata was hand-edited.
