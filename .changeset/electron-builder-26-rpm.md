---
"cncjs": patch
---

build(linux): upgrade electron-builder to 26.18.1 so RPM packaging works on current runners

`yarn build:linux` builds RPMs through the fpm binary that electron-builder downloads. Version 23.6.0 pins fpm 1.9.3, which only tells rpmbuild where the staged files are with `--define buildroot`. rpmbuild 4.20 and later ignore that define and use their own buildroot, so every file in the payload is reported as missing and the RPM target fails on `ubuntu-latest` (Ubuntu 26.04, rpm 6.0.1). electron-builder 26.18.1 ships fpm 1.17.0, which passes `--buildroot` as well.

Three related config changes:

- `rpm.fpm` pins `--rpm-rpmbuild-define=_rpmformat 4`. rpm 6 defaults to the v6 package format (`%_rpmformat 6`), which rpm 4.x readers only parse partially.
- `publish` is set to `null` instead of `[]`. An empty array still counts as "publish", and electron-builder 26 falls back to the GitHub publisher when it detects CI, which fails without `GH_TOKEN` and would otherwise create an extra release.
- `npmRebuild` is set to `false`, and the `electron-rebuild` step is removed from `scripts/electron-builder.sh`. `node-gyp-build` loads `build/Release` before `prebuilds`, so the x86_64 `bindings.node` compiled on the runner shipped inside every package, including the arm ones, where it cannot be loaded. serialport's own N-API prebuilds (`linux-x64`, `linux-arm64`, `linux-arm`, `darwin-x64+arm64`, `win32-x64`, `win32-ia32`) are now packaged and selected by the machine's platform/arch at runtime.

Keep armv7l desktop packages for short-term compatibility. Electron 22's Linux
armv7l runtime reports `arm_version: "default"`, so `src/main.js` sets `ARM_VERSION=7`
before the server is launched, only in that runtime and only when no override is
present. Other architectures and plain Node.js keep their existing selection behavior.

The Linux build job now checks its own output: no runner-compiled native module may
appear in any unpacked package, the shipped Electron binary (not the runner's
Node.js) loads the serialport addon, and every produced RPM is re-read with
`rpm -qp`. Electron remains at 22.0.3; its upgrade is outside this change.
