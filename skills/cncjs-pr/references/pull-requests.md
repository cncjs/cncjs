# Pull request and commit text

Covers commit subjects, PR titles, references, and bodies. Start with read-only
working-tree and history evidence:

```sh
rtk git status --short
rtk git diff HEAD
rtk git log -10 --oneline
```

`git diff HEAD` shows tracked staged and unstaged changes, not untracked files.
Inspect relevant untracked files separately. For an already-committed PR,
inspect its base-to-head diff; a working-tree diff does not replace it. Use the
base from actual PR metadata when available, and report an unconfirmed target
instead of choosing a branch without evidence.

## Drafting workflow

1. **Establish scope.** Identify the intended repository, head, and base from
   the request or existing PR metadata. Separate the requested change from
   unrelated work and note any target or scope you cannot verify.
2. **Classify the change.** Identify affected user behavior, controller or
   runtime boundaries, compatibility impact, and changed release artifacts.
3. **Draft.** Write the title and body from the evidence. If a release note is
   warranted, assess the bump and draft it using [Changesets](changesets.md).
4. **Review.** Apply the checklist below. Return draft text unless delivery is
   requested. For authorized delivery, confirm the repository, head and base
   before submitting, and report the actual PR URL and target.

## Commit and PR title

Use a conventional commit subject:

```
<type>(<scope>): <description>
```

Use the types in `commitlint.config.js`: `build`, `chore`, `ci`, `cd`, `docs`,
`feat`, `fix`, `i18n`, `l10n`, `perf`, `refactor`, `revert`, `style`, and `test`.
Keep the title short enough to scan. Prefer the imperative mood, a lowercase
description, and no trailing period.

- Use a real path or domain scope when it describes the change; omit the scope
  when no useful scope fits. Recent history uses `api`, `autolevel`, `deps`,
  `docker`, `electron`, `gcode`, `grbl`, `grbl-simulator`, `l10n`, `release`,
  `visualizer`, `webcam`, and `widgets/Axes`.
- Wrap identifiers, paths, and option names in backticks when it improves
  scanning; do not wrap the whole subject.
- Name the changed behavior, not the fact that a change occurred. Prefer
  `fix(webcam): retain the selected camera on reconnect` to `fix: fix webcam`.

Controller scopes follow the change, not the file location alone:

| Change | Scope |
| --- | --- |
| One controller pair (server and widget) | `(Grbl)`, `(Marlin)`, `(Smoothie)`, or `(TinyG)` |
| Shared controller helper | Keep the controller scope; name the helper and any other affected controllers in the body |
| Several controllers | Omit the scope and list every affected controller in the body |
| Grbl simulator | `(grbl-simulator)` |
| g2core-specific behavior | `(g2core)`; otherwise use `(TinyG)` |

Read `cncjs-controller` before changing a controller or its widget.

### PR references

Put the PR number at the end of the subject as `(#123)`, with one space before
it. Use it only for the merged squash commit, never for a PR title or an
ordinary commit subject. GitHub adds it on squash merge, so do not add it twice.
Release PR merges follow the same pattern, for example
`chore(release): version packages (#1009)`. Backports keep their own
number and name the original PR or commit in the body. Never guess a PR number:
read it from the PR URL or the repository metadata.

Examples from the repository history:

```
fix(webcam): honor camera selection and manage media streams (#1025)
feat(api): stream raw request bodies to the watch directory (#1014)
docs: list the WHB04B-6 WebHID pendant (#1023)
```

## PR body

Always include `Summary` and `Testing`. Add `Changes` for multiple areas,
`Motivation` when the reason is not apparent, and `Migration` for breaking
changes.

```markdown
## Summary

One to three sentences describing the change and the user-visible effect.

## Changes

- **Area or file**: what changed and why.
- **Area or file**: what changed and why.

## Testing

- Commands actually run and their result.
- Coverage added or updated.
- What was not run, if that matters.

## Motivation

Why the change is needed, if the summary does not already explain it.

## Migration

What breaks and what callers must do. Show before and after where useful.
```

Rules:

- Describe behavior, not a file-by-file diff dump.
- Link only confirmed issues. Use a closing reference such as `Closes #NNN`
  only when the change resolves the issue.
- Link a confirmed related PR or prerequisite with `Related:` or `Depends on:`;
  do not use a closing reference for a dependency or a partial fix.
- State the reason for non-obvious changes, especially safety, compatibility,
  and controller-protocol behavior.
- List only verification that was actually performed, such as `yarn lint`,
  `yarn test`, or `yarn build`; do not claim CI results you did not observe.
  If no checks ran, say so. Separate local checks, CI, simulator results,
  and physical-controller testing.
- Include a migration section for renamed/removed APIs, changed defaults, or
  changed on-disk/runtime requirements.
- Do not add generated checklists, invented demo links, or claims about CI.
- Use the relevant specialized skill to implement or verify a widget,
  controller, or localization change, not just to draft its PR text.

## Completion checklist

- [ ] Title follows `<type>(<scope>): <description>` and the commitlint rules.
- [ ] The description says what changed and why, not just where.
- [ ] Controller scopes match the actual affected controller(s).
- [ ] Subject suffix `(#NNN)` is present only on the merged squash commit.
- [ ] Body lists real verification; no fabricated results.
- [ ] Breaking changes include migration guidance.
