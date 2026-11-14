# Pull request and commit text

Covers commit subjects, PR references, and PR bodies. Assume the actual diff and
verification have already been inspected; do not describe work from a summary
alone.

## Commit and PR title

Use a conventional commit subject:

```
<type>(<scope>): <description>
```

The repository history uses `build`, `chore`, `ci`, `docs`, `feat`, `fix`,
`i18n`, `l10n`, `perf`, `refactor`, `revert`, `style`, and `test`. This checkout
has no commitlint configuration, so match the existing history rather than
relying on an enforced linter: use the imperative mood, a lowercase description
after the colon, no trailing period, and a subject short enough to scan.

- Use a real path or domain scope when it describes the change; omit the scope
  when no useful scope fits. Recent history uses `api`, `autolevel`, `deps`,
  `docker`, `electron`, `gcode`, `grbl`, `grbl-simulator`, `l10n`, `release`,
  `visualizer`, `webcam`, and `widgets/Axes`.
- Wrap identifiers, paths, and option names in backticks when it improves
  scanning; do not wrap the whole subject.

Controller scopes follow the change, not the file location alone:

| Change | Scope |
| --- | --- |
| One controller pair (server and widget) | `(Grbl)`, `(Marlin)`, `(Smoothie)`, or `(TinyG)` |
| Shared controller helper | Use a controller or domain scope when it fits; name affected controllers in the body |
| Several controllers | A shared domain scope such as `(autolevel)` may fit; otherwise omit the scope. List affected controllers in the body |
| Grbl simulator | `(grbl-simulator)` |
| g2core-specific behavior | `(g2core)`; otherwise use `(TinyG)` |

Read `cncjs-controller` before changing a controller or its widget.

### PR references

Put the PR number at the end of the subject as `(#123)`, with one space before
it. Use it only when the commit is the merged PR commit; GitHub adds it on
squash merge, so do not add it twice. Release PR merges carry it the same way,
for example `chore(release): version packages (#1009)`. Backports keep their own
number and name the original PR or commit in the body. Never guess a PR number:
read it from the PR URL or the repository metadata.

Examples from the repository history:

```
fix(webcam): honor camera selection and manage media streams (#1025)
feat(api): stream raw request bodies to the watch directory (#1014)
docs: list the WHB04B-6 WebHID pendant (#1023)
```

## PR body

Use only the sections that help the reviewer:

```markdown
## Summary

Closes #NNN (if applicable). One to three sentences describing the change and
the user-visible effect.

## Changes

- **Area or file**: what changed and why.
- **Area or file**: what changed and why.

## Testing

- Commands actually run and their result.
- Coverage added or updated.
- What was not run, if that matters.

## Migration

Before/after usage for a breaking change.

## Breaking Changes

What breaks and what callers must do.
```

Rules:

- Describe behavior, not a file-by-file diff dump.
- State the reason for non-obvious changes, especially safety, compatibility,
  and controller-protocol behavior.
- List only verification that was actually performed, such as `yarn lint`,
  `yarn test`, or `yarn build`; do not claim CI results you did not observe.
- Include a migration section for renamed/removed APIs, changed defaults, or
  changed on-disk/runtime requirements.
- Do not add generated checklists, invented demo links, or claims about CI.
- If the change affects a widget, controller, or translation flow, follow the
  corresponding specialized skill for the details rather than repeating them.

## Completion checklist

- [ ] Title follows `<type>(<scope>): <description>` and the observed style.
- [ ] The description says what changed and why, not just where.
- [ ] Controller scopes match the actual affected controller(s).
- [ ] PR reference is present only when it is the merged PR commit.
- [ ] Body lists real verification; no fabricated results.
- [ ] Breaking changes include migration guidance.
