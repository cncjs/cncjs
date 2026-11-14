# Pull request and commit text

Covers commit subjects, PR references, and PR bodies. Assume the actual diff and
verification have already been inspected; do not describe work from a summary
alone.

## Commit and PR title

Use a conventional commit subject:

```
<type>(<scope>): <description>
```

- Use the commitlint types: `build`, `chore`, `ci`, `cd`, `docs`, `feat`, `fix`,
  `i18n`, `l10n`, `perf`, `refactor`, `revert`, `style`, `test`.
- Use the imperative mood and a lowercase description after the colon. Do not
  end with a period.
- Keep the header within the repository's commitlint limit (128 characters).
- Omit the scope when the change crosses areas; otherwise use a real path or
  domain scope such as `api`, `watch`, `deps`, `ci`, `docs`, `release`,
  `widgets/Axes`, `l10n`, or `grbl-simulator`.
- Wrap identifiers, paths, and option names in backticks when it improves
  scanning; do not wrap the whole subject.

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
it. Use it only when the commit is the merged PR commit; GitHub adds it on
squash merge, so do not add it twice. Release commits such as
`chore(release): version packages` take no PR reference. Backports keep their
own number and name the original PR or commit in the body. Never guess a PR
number: read it from the PR URL or the repository metadata.

Examples:

```
fix(api): confine watch writes and stop restreamer corrupting uploads
feat(watch): stream raw uploads to the watch directory instead of buffering them
fix(deps): keep packaged native modules on their target architecture
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
- List only verification that was actually performed; do not claim CI results
  you did not observe.
- Include a migration section for renamed/removed APIs, changed defaults, or
  changed on-disk/runtime requirements.
- Do not add generated checklists, invented demo links, or claims about CI.
- If the change affects a widget, controller, or translation flow, follow the
  corresponding specialized skill for the details rather than repeating them.

## Completion checklist

- [ ] Title follows `<type>(<scope>): <description>` and the commitlint rules.
- [ ] The description says what changed and why, not just where.
- [ ] Controller scopes match the actual affected controller(s).
- [ ] PR reference is present only when it is the merged PR commit.
- [ ] Body lists real verification; no fabricated results.
- [ ] Breaking changes include migration guidance.
