# Release flow

Versions, changelogs, tags, and packages are produced by repository tooling.
This reference describes the flow and what to inspect; it does not authorize a
release action.

## Workflow sources

- Read `.changeset/config.json` (`baseBranch`, `changelog`, `access`) and the
  current release workflows to determine the base branch, triggers, and
  versioning flow for this checkout. Do not hard-code branch roles, PR targets,
  or merge directions in shared skills.
- Follow the workflow that owns versioning, not old manual
  `chore(release): publish` history or a policy copied from another branch.
- Root `package.json` owns the version, `yarn package-sync` generates
  `src/package.json`, and Changesets writes release notes into `CHANGELOG.md`.

## Normal release flow

1. Each user-visible change carries a changeset; see `cncjs-pr`.
2. After the change lands on the configured base branch, `ci-release` runs
   `changesets/action`. It opens or updates the release PR titled
   `chore(release): version packages`. The job only runs in `cncjs/cncjs`; it is
   skipped in forks.
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

A push to the branch named in `ci.yml` also runs `yarn build-latest` and
refreshes the `<branch>-latest` GitHub release with the desktop artifacts. That
release and its assets are workflow-managed; do not delete, re-upload, or retag
them by hand.

`yarn ci-dispatch` runs `gh workflow run ci.yml --repo cncjs/cncjs --ref`; a
dispatch is an external write and needs authorization.

## What a release PR should contain

- The expected version in `package.json` and `src/package.json`.
- The expected generated `CHANGELOG.md` sections and removed changeset files.
- A `yarn.lock` change only from the versioning command.
- No unrelated source changes.

`yarn build-latest` stamps a commit-suffixed version into `src/package.json` in
the working tree. Do not commit that change.

If the release PR has conflicts or an unexpected version, stop and report the
discrepancy. Do not force-push, rewrite history, or edit the version by hand to
make it match.

## Verification

- Inspect the release PR diff and confirm the expected files changed.
- Report exactly which checks ran; do not claim CI, release, or artifact results
  you did not observe.

## Troubleshooting

- **Release PR not opened:** check the `ci-release` run for the configured base
  branch and its repository guard; a fork run is skipped.
- **Tag exists but assets are missing:** check the `ci.yml` run for that tag; do
  not create a replacement tag.
- **npm published but no tag:** `changeset publish` owns tag creation; inspect
  the release workflow rather than tagging manually.
- **Docker image missing:** check the `ci-docker-hub` run for the tag and the
  production artifact it consumes.
- **Version PR shows an unexpected bump:** check the changeset bump types and
  the current version on the release branch; fix the changesets before merging,
  not the generated version.
