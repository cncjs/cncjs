# Runtime support and packaging

Covers supported Node.js lines, desktop architectures, local packaging, and the
container image. Version numbers live in `package.json`,
`grbl-simulator/package.json`, `Dockerfile`, the CI workflows, and the README;
read them there rather than copying a number from a guide.

## Runtime support changes

When changing supported Node.js lines or desktop architectures:

1. Update `engines.node` in `package.json` and `grbl-simulator/package.json`.
2. Update `NODE_VERSION` in `Dockerfile` and any CI `node-version` matrix that
   encodes a line or minimum patch.
3. Update the README "Supported Node.js Versions" and "Desktop App
   Architectures" tables.
4. Update packaging scripts and CI artifact checks when an architecture is
   added or removed.
5. Add a changeset describing the user-visible support change and the reason.
6. Run the verification below.

Derive the versions from the security or runtime source the change cites, then
record them in the source files. Do not invent a minimum patch or carry a number
over from an old issue or changeset.

## Desktop artifacts

Packaging runs from the production build:

```sh
yarn build
yarn build:macos-arm64   # or build:macos-x64
yarn build:linux         # x64 and ARM64
yarn build:windows-x64
```

`scripts/electron-builder.sh` installs production dependencies in `dist/cncjs`
and invokes electron-builder; artifacts land in `output/`. CI builds the
supported targets and attaches them to the release. Packaging is not publishing:
do not upload artifacts, create a GitHub release, or run the publish scripts
unless asked.

`ci.yml` checks the Linux output before attaching it: it rejects runner-compiled
native modules in the unpacked packages, loads the serialport addon with the
shipped Electron binary, and re-reads every produced RPM. Do not weaken those
checks when changing packaging.

## Container image

`ci-docker-hub.yml` runs on version tags and publishes `cncjs/cncjs` for
`linux/amd64` and `linux/arm64` using the production `dist/cncjs` artifact. A
local `docker build` is a verification step only; do not push an image or move
the `latest` tag without explicit authorization.

## Verification

- Confirm the CI matrices and README tables agree with `engines.node` in both
  packages.
- Confirm the Dockerfile uses the intended runtime and that the build consumes
  `dist/cncjs`.
- For a packaging change, inspect the release PR diff and confirm the expected
  files changed.
- Run the repository checks that match the change and report exactly what ran;
  do not claim unobserved results.
