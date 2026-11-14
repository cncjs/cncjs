# Yarn dependencies

Yarn manages the repository's dependencies and lockfile. `src/package.json` is
a separately maintained desktop manifest with some fields synchronized from
the root; it is not generated wholesale.

## Tooling and invariants

- The Yarn release is pinned by `yarnPath` in `.yarnrc.yml`; `nodeLinker` is
  `node-modules`. Run Yarn through the repository (`yarn <command>`), not a
  globally selected release.
- Use `yarn install`, `yarn add <pkg>`, `yarn add -D <pkg>`, `yarn remove <pkg>`,
  `yarn up <pkg>`, and `yarn <script>` for repository dependencies.
- Keep `yarn.lock` consistent with dependency changes; never hand-edit it. Include
  the manifest when its declarations change, but do not fabricate a manifest
  change for a lockfile-only resolution update. Conversely, edits to scripts or
  other manifest metadata do not automatically require a lockfile change.
- Avoid introducing a root `package-lock.json` as a second project lockfile.
  This does not ban npm: the README uses it to install CNCjs, CI uses it to
  bootstrap tooling, and repository scripts invoke npm as described below.
- In `ci.yml` and `ci-docker-hub.yml`, CI runs `yarn up` and `yarn install`
  before lint and tests; `ci-release.yml` uses `yarn install`, and release
  versioning runs `yarn install --mode=update-lockfile` via `yarn ci-version`.
- `grbl-simulator/package.json` is separate. Keep its `engines.node` aligned
  with the root package when changing their supported Node.js range.
- Add a `packageExtensions` entry in `.yarnrc.yml` only for a real missing peer
  dependency; do not use it to silence an unrelated warning.
- If `yarn.lock` conflicts, resolve by reinstalling with Yarn on the target
  branch; never merge conflict markers into the lockfile.

## Desktop manifest synchronization

`scripts/package-sync.js` reads the existing `src/package.json`, overwrites
`version`, `homepage`, `author`, `license`, `repository`, and `dependencies`,
and preserves other fields, including `name`, `productName`, `description`,
and `main`. Maintain those unsynchronized fields directly when needed; do not
hand-edit the synchronized fields.

Dependencies are picked from root `dependencies` using imports discovered in
`src/*.js` and `src/server/**/*.{js,jsx}`, plus an explicit list in the script.
The script does not scan `src/electron-app/` and is not a general dependency
discovery guarantee. When relevant imports or root dependencies change, run
`yarn package-sync` and inspect the resulting manifest, especially for dynamic
or scoped imports. Builds and `yarn ci-version` also run synchronization.

`scripts/electron-builder.sh` removes `dist/cncjs/node_modules`, runs
`npm install --production` and `npm dedupe` in `dist/cncjs`, then invokes
`npm run electron-builder` from the root. This can create a package lock in the
ignored build directory; it is distinct from the repository's Yarn lockfile.
See [Runtime and packaging](runtime-and-packaging.md) for build side effects
and the checks to make before running packaging.

## Completion

- Dependency declarations and `yarn.lock` agree when changed; a legitimate
  lockfile-only update remains valid. Review synchronized desktop fields where
  relevant, while preserving the separately maintained fields.
- Assess a changeset for dependency or build changes that affect users or
  delivered artifacts; follow `cncjs-pr` for observed practice.
- Report any check that was run; do not claim a clean install you did not
  perform.
