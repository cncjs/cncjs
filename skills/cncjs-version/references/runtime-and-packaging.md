# Runtime support and packaging

Covers supported Node.js lines, Electron's runtime, desktop architectures,
local packaging, and the container image. Read the current values in
`package.json`, `grbl-simulator/package.json`, `Dockerfile`, CI, and the README
rather than copying a number from a guide.

## Runtime and architecture changes

- For a Node.js support change, update the root and simulator `engines.node`
  ranges and README support table. Review both Dockerfile `NODE_VERSION` values
  and each CI runtime selection; update them when needed. CI's tested Node.js
  lines need not cover every supported line.
- Electron bundles its own Node.js runtime. The root engine range, CI's host
  Node.js, and Docker's Node.js do not update or prove the security of that
  bundled runtime. Inspect the root Electron dependency and Electron's actual
  bundled Node.js version and support when changing desktop runtime support.
- For desktop architecture changes, update the relevant `build:*` scripts,
  electron-builder configuration, CI jobs and artifact checks, and README
  architecture table as applicable. Do not change Node.js engine ranges,
  simulator, or Dockerfile merely because a desktop architecture changed.
- Distinguish desktop targets from the host running the build, the npm package's
  runtime platforms, and Docker's separately configured image platforms. A
  listed desktop target does not by itself prove its native modules work.
- Assess a changeset describing any user-visible support or artifact change;
  see `cncjs-pr` for observed practice.

Derive new version requirements from the cited security or runtime source;
do not invent a minimum patch or carry one over from an old issue or changeset.

## Desktop artifacts

Before running any build, inspect the affected paths and preserve user data.
Ask before a command would delete existing generated or untracked data unless
the user authorized that exact deletion:

- `yarn build` runs `scripts/build-prod.sh`, which synchronizes
  `src/package.json`, removes `dist/*`, and runs i18n scanners
  that can rewrite source locale files. `yarn build-latest` has the same
  effects and additionally stamps a commit-suffixed desktop version into
  `src/package.json`; do not commit that stamp.
- Development builds also synchronize the manifest and remove `output/*`; the
  PowerShell variant removes the directory itself. Do not automatically
  discard existing source or generated changes afterward.
- `scripts/electron-builder.sh` deletes `dist/cncjs/node_modules`, runs
  `npm install --production` and `npm dedupe` there, and invokes
  electron-builder, which writes to `output/`. These steps may download packages
  and change generated files or a lockfile in `dist/cncjs`.

When authorized and the affected paths are safe, the local packaging commands
begin with a production build:

```sh
yarn build
yarn build:macos-arm64   # or build:macos-x64
yarn build:linux         # x64 and ARM64
yarn build:windows-x64
```

The root builder configuration currently sets `publish` to `null` and
`npmRebuild` to `false`. Inspect configuration and environment before
packaging; uploading artifacts, creating a GitHub release, or publishing
remains a separate authorized action.

`ci.yml` searches both Linux unpacked directories for `.node` files matching
`*/build/Release/*.node`. It runs `SerialPort.list()` using the shipped **x64**
Electron binary; this is not an ARM64 runtime test or a
physical-controller test. If `rpm` is installed, it queries metadata for each
RPM present, but does not verify payload integrity or older RPM compatibility.
The later asset-preparation step copies the expected named files. Do not weaken
these checks or infer that they exercise macOS, Windows, or every Linux target.

## Container image

`ci-docker-hub.yml` is configured for `v*` tag pushes and manual dispatch. Its
own build job creates the production `dist/cncjs` artifact on a tag; the deploy
job builds and pushes `linux/amd64` and `linux/arm64` images with both the
derived tag and `latest`. A local `docker build` is verification only; do not
push or dispatch without explicit authorization. See [Release](release.md)
for token-trigger and dispatch caveats.

## Verification

- Compare the intended Node.js ranges with both package manifests, README,
  Docker runtime, and CI selections as applicable; separately review Electron's
  bundled runtime and the desktop and container target architectures.
- For packaging, inspect the actual CI run and job logs, the expected asset
  names, and release artifacts; a release PR diff or configured workflow is
  not evidence that an artifact was produced, uploaded, or is usable.
- Verify relevant package contents and native-module loading on each affected
  target architecture, and install or smoke-test where feasible. Record what
  was not tested, including hardware or older RPM compatibility.
- Run checks appropriate to the changed boundary and report only observed
  results; do not claim unobserved CI, runtime, or artifact verification.
