# Changesets

The published package is `cncjs`. `src/package.json` describes the desktop app,
not a second Changesets package; `yarn package-sync` updates only selected
fields in that manifest. See `cncjs-version` for the synchronization boundary.

## When to propose a changeset

Recommend a changeset for a user-visible feature, fix, dependency, support, or
packaging change. Assess the delivered effect rather than only the paths changed:
a CI-only change can alter desktop or container release artifacts even when it
does not change the npm package. Docs, tests, CI, and internal changes with no
effect on users or delivered artifacts generally need no release note.

This is guidance, not an enforced repository policy. Inspect the current
`.changeset/` entries, relevant history, and release PR when deciding.

## File

For a new entry, use one file per logical change in `.changeset/`:

```
.changeset/<slug>.md
```

Existing entries use both descriptive slugs and `cncjs-pr-<number>` names. Do
not invent a PR number or duplicate an entry for the same change. Multiple
independent changes in one PR need not be forced into a single entry.
`@changesets/cli` is installed; `yarn changeset` can create the file.

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
- [ ] Any entry uses the right package, a clear summary, and no invented PR
      number or duplicate entry.
- [ ] No version, changelog, lockfile, or release metadata was hand-edited.
