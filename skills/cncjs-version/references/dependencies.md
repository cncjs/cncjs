# Yarn dependencies

Yarn manages repository dependencies and the root lockfile. `src/package.json`
is the desktop manifest; `package-sync` updates only selected fields.

## Tooling and invariants

- The Yarn release is pinned by `packageManager` in `package.json` and
  `yarnPath` in `.yarnrc.yml`; `nodeLinker` is `node-modules`.
- Use `yarn install`, `yarn add <pkg>`, `yarn add -D <pkg>`, `yarn remove <pkg>`,
  `yarn up <pkg>`, and `yarn <script>`.
- Do not use npm or pnpm to manage repository dependencies or add a root
  `package-lock.json`. This does not prohibit npm for CI tool setup or the
  Electron staging install.
- Keep `yarn.lock` consistent with dependency changes; never hand-edit it.
  Include the corresponding manifest when dependency declarations change.
  A lockfile-only resolution update does not require a manifest change.
- Check the workflow that owns the task. `ci.yml` uses `yarn install
  --immutable`; `ci-docker-hub.yml` runs `yarn up` then `yarn install`;
  `ci-release.yml` runs `yarn install`. Release versioning uses
  `yarn install --mode=update-lockfile`.
- After changing a dependency used by `src/`, run `yarn package-sync` and
  commit the updated `src/package.json`. Do not hand-edit fields synchronized
  by `scripts/package-sync.js`: `version`, `homepage`, `author`, `license`,
  `repository`, and `dependencies`. Maintain other desktop fields directly
  in `src/package.json`.
- `grbl-simulator/package.json` is a separate package. Keep its `engines.node`
  aligned with the root package when runtime support changes.
- Add a `packageExtensions` entry in `.yarnrc.yml` only for a real missing peer
  dependency; do not use it to silence an unrelated warning.
- If `yarn.lock` conflicts, resolve by reinstalling with Yarn on the target
  branch; never merge conflict markers into the lockfile.

## Electron staging dependencies

`scripts/electron-builder.sh` runs `npm install --production` and `npm dedupe`
in `dist/cncjs` against the staged desktop manifest. That install is separate
from the root Yarn project. Any npm lockfile produced there is a build artifact,
not a repository lockfile. See [Runtime and packaging](runtime-and-packaging.md)
for build side effects and platform checks.

## Completion

- Dependency declarations and `yarn.lock` agree when changed. Review the
  synchronized desktop fields if the change affects their dependencies.
- A dependency or build change that alters the shipped package has a changeset;
  follow `cncjs-pr` for its format and bump.
- Report any check that was run; do not claim a clean install you did not
  perform.
