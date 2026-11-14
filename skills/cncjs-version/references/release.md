# Release flow

Versions, changelogs, tags, and packages are produced by repository tooling.
This reference describes the flow and what to inspect; it does not authorize a
release action.

## Workflow sources

- Read `.changeset/config.json` and the current release workflows to determine
  the base branch, triggers, and versioning flow for this checkout. Do not
  hard-code branch roles, PR targets, or merge directions in shared skills.
- Follow the owning versioning workflow, not old manual
  `chore(release): publish` history or a policy copied from another branch.
- Root `package.json` owns the version, `yarn package-sync` generates
  `src/package.json`, and Changesets consumes release notes into `CHANGELOG.md`.

## Normal release flow

1. Each user-visible change carries a changeset; see `cncjs-pr`.
2. After the change lands on the release line, `ci-release` runs
   `changesets/action`. It opens or updates the release PR titled
   `chore(release): version packages`.
3. The release PR runs `yarn ci-version`, which is
   `changeset version && node scripts/package-sync.js && yarn install --mode=update-lockfile`.
   That updates the version, synchronizes `src/package.json`, consumes the
   changesets, and updates the lockfile.
4. Merging the release PR runs `yarn ci-publish`, which is
   `yarn build && changeset publish`. Changesets publishes the `cncjs` package
   and creates the release tag.
5. The tag triggers `.github/workflows/ci.yml`, which builds and attaches the
   desktop artifacts, and `.github/workflows/ci-docker-hub.yml`, which builds and
   pushes the multi-architecture container image.

Inspect `ci.yml` for the current artifact and prerelease triggers. Do not delete,
re-upload, or retag workflow-managed GitHub release assets by hand.

## What a release PR should contain

- The expected version in `package.json` and `src/package.json`.
- The expected generated `CHANGELOG.md` sections and removed changeset files.
- A `yarn.lock` change only from the versioning command.
- No unrelated source changes.

If the release PR has conflicts or an unexpected version, stop and report the
discrepancy. Do not force-push, rewrite history, or edit the version by hand to
make it match.

## Verification

- Inspect the release PR diff and confirm the expected files changed.
- Report exactly which checks ran; do not claim CI, release, or artifact results
  you did not observe.

## Troubleshooting

- **Tag exists but assets are missing:** check the `ci.yml` run for that tag; do
  not create a replacement tag.
- **npm published but no tag:** `changeset publish` owns tag creation; inspect
  the release workflow rather than tagging manually.
- **Docker image missing:** check the `ci-docker-hub` run for the tag and the
  production artifact it consumes.
- **Version PR shows an unexpected bump:** check the changeset bump types and
  the current version on the release branch; fix the changesets before merging,
  not the generated version.
