# Yarn dependencies

This repository uses Yarn exclusively. Dependency changes are ordinary source
changes, but the lockfile and the generated desktop package must stay in sync.

## Tooling and invariants

- The Yarn release is pinned by `packageManager` in `package.json` and
  `yarnPath` in `.yarnrc.yml`; `nodeLinker` is `node-modules`.
- Use `yarn install`, `yarn add <pkg>`, `yarn add -D <pkg>`, `yarn remove <pkg>`,
  `yarn up <pkg>`, and `yarn <script>`.
- Do not use npm or pnpm, and do not create or commit `package-lock.json`.
- Commit `package.json` and `yarn.lock` together. Never hand-edit `yarn.lock`.
- CI installs with `yarn install --immutable`; release versioning uses
  `yarn install --mode=update-lockfile`.
- After changing a dependency used by `src/`, run `yarn package-sync` and commit
  the regenerated `src/package.json`. Do not hand-edit that file.
- `grbl-simulator/package.json` is a separate package. Keep its `engines.node`
  aligned with the root package when runtime support changes.
- Add a `packageExtensions` entry in `.yarnrc.yml` only for a real missing peer
  dependency; do not use it to silence an unrelated warning.
- If `yarn.lock` conflicts, resolve by reinstalling with Yarn on the target
  branch; never merge conflict markers into the lockfile.

## Completion

- `package.json` and `yarn.lock` are committed together, and `src/package.json`
  is regenerated when a dependency it consumes changed.
- A dependency or build change that alters the shipped package has a changeset;
  follow `cncjs-pr` for its format and bump.
- Report any check that was run; do not claim a clean install you did not
  perform.
