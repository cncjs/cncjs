# cncjs

## 1.12.0

### Minor Changes

- b7a0212: fix: require a Node.js version with the CVE-2026-111497 (Node2Shell / HTTP2Shell) fix, and end 32-bit ARM packages

  CVE-2026-111497 is reported as Node2Shell, HTTP2Shell, and Broccoli2Shell. They name the same defect: the Brotli decoder bundled with Node.js writes past the end of an eight-byte internal buffer, because an invalid block switch is reported as a temporary need for more input instead of a permanent format error. The write corrupts process memory and can run arbitrary code. "HTTP2Shell" describes how the stream arrives: a crafted compressed message body delivered over HTTP. Brotli 1.0.3 through 1.2.0 are affected. Node.js fixed it on 2026-10-21 in 22.23.4, 24.22.1, and 26.12.1. Release lines already past end of life on that date received no fix.

  CNCjs is not a Brotli decoder. `yarn.lock` contains no Brotli package, and no CNCjs dependency decompresses an HTTP request body or response body. The exposure is the runtime the server runs inside: any code path in CNCjs, a plugin, or a dependency added later that calls the Brotli API in `node:zlib` reaches the flaw.

  - `engines.node` is now `^24.22.1 || >=26.12.1`. `grbl-simulator` uses the same range.
  - The Docker image pinned an end-of-life Node.js build that shipped the unpatched decoder. Both stages now install v24.22.2 on Debian 13 (trixie); Debian 11 left LTS on 2026-08-31.
  - armv7l (32-bit ARM) is no longer a target, because 24 and 26 publish no armv7l binaries. `build:linux` builds x64 and ARM64, `build:linux-armv7l` is removed, CI no longer packages or checks armv7l output, and the `ARM_VERSION=7` workaround in `src/main.js` that only the 32-bit ARM desktop build needed is gone.
  - CI already resolves the newest patch release of a supported line (`node-version: 24.x` in `ci.yml`, `node-version: 24` in `ci-docker-hub.yml` and `ci-release.yml`), so no extra version gate is added.
  - README lists the supported versions, the minimum patch release for each line, and the reason.

  The desktop app bundles its own Node.js runtime, and `engines.node` does not reach it. That runtime is still unpatched; its upgrade is tracked in #1031.

### Patch Changes

- ab7592c: Add autolevel scan pattern and scan direction options. The scan pattern (Raster, Zigzag, Spiral In, Spiral Out) and the scan direction (Along X Axis, Along Y Axis) set the order in which probe points are visited. The grid, the point count and the probing itself are unchanged, and the defaults keep the previous row-by-row order. The probe area diagram and the 3D overlay mark the first and last point of the selected path.
- c28068d: feat(watch): add rename and delete for files in the watch directory

  `DELETE /api/watch/file` removes a file from the watched directory and `POST /api/watch/file/rename` renames one within it. Both act on plain files only and refuse a name containing directory components rather than stripping it, so they cannot act on a file outside the watched directory. Renaming refuses to overwrite an existing target and answers 409 instead. Symbolic links are refused rather than followed, and renaming falls back to an exclusive copy on filesystems without hard-link support.

- 3a9887a: fix(visualizer): preserve and remember the selected camera view

  Loading a G-code file or closing it resets the 3D camera to the default top-down view through the trackball controls, but the toolbar selection did not change, so the highlighted button (for example 3D View) no longer matched the scene and the view had to be re-selected by clicking another view first. The Visualizer now re-applies the view selected in the toolbar after a load, an unload and when the widget mounts, so the scene follows the selection.

  The selected view (Top, Front, Right, Left or 3D) is now saved in the widget settings and restored when the app is opened again, instead of always starting on Top View. Unknown saved values fall back to Top View. Closing the serial port no longer switches the view back to Top.

- bef4f07: build(linux): upgrade electron-builder to 26.18.1 so RPM packaging works on current runners

  `yarn build:linux` builds RPMs through the fpm binary that electron-builder downloads. Version 23.6.0 pins fpm 1.9.3, which only tells rpmbuild where the staged files are with `--define buildroot`. rpmbuild 4.20 and later ignore that define and use their own buildroot, so every file in the payload is reported as missing and the RPM target fails on `ubuntu-latest` (Ubuntu 26.04, rpm 6.0.1). electron-builder 26.18.1 ships fpm 1.17.0, which passes `--buildroot` as well.

  Three related config changes:

  - `rpm.fpm` pins `--rpm-rpmbuild-define=_rpmformat 4`. rpm 6 defaults to the v6 package format (`%_rpmformat 6`), which rpm 4.x readers only parse partially.
  - `publish` is set to `null` instead of `[]`. An empty array still counts as "publish", and electron-builder 26 falls back to the GitHub publisher when it detects CI, which fails without `GH_TOKEN` and would otherwise create an extra release.
  - `npmRebuild` is set to `false`, and the `electron-rebuild` step is removed from `scripts/electron-builder.sh`. `node-gyp-build` loads `build/Release` before `prebuilds`, so the x86_64 `bindings.node` compiled on the runner shipped inside every package, including the arm ones, where it cannot be loaded. serialport's own N-API prebuilds (`linux-x64`, `linux-arm64`, `darwin-x64+arm64`, `win32-x64`, `win32-ia32`) are now packaged and selected by the machine's platform/arch at runtime.

  The Linux build job now checks its own output: no runner-compiled native module may
  appear in any unpacked package, the shipped Electron binary (not the runner's
  Node.js) loads the serialport addon, and every produced RPM is re-read with
  `rpm -qp`. Electron remains at 22.0.3; its upgrade is outside this change.

- 747ffcd: feat(watch): stream raw uploads to the watch directory instead of buffering them

  `PUT /api/watch/file` now accepts a raw request body and streams it straight to disk, so large G-code programs no longer have to be held in memory as a JSON string. Sending a JSON body is unchanged; when the body is not JSON the file name is taken from the `file` query parameter. The streamed write goes to a temporary name and is renamed into place on completion, so a partially written file never appears under its final name inside the watched directory. Streamed uploads are bounded by a new `middleware.upload.maxFileSize` setting (256MB, matching the JSON body limit) and answer 413 when exceeded.

- b47cc58: fix(webcam): use the selected camera and switch cameras without remounting

  Fix Webcam camera selection and switch cameras without restarting the widget. Release shared streams when the last widget closes, discard outdated requests, and try video without audio when a microphone is unavailable.

## 1.11.5

### Patch Changes

- feat: add support for uploading files to the watch directory by [#ethantraas1](https://github.com/ethantraas1) in [#1008](https://github.com/cncjs/cncjs/pull/1008)

  Rework the Watch Directory modal: add an "Add" button and a dropzone to upload files to the configured watch directory, with an upload progress indicator. The file tree updates in real time via server push events and also provides a Refresh button.

- fix(autolevel): store probe measurements at the intended grid node's XY by [@thcasssio](https://github.com/thcasssio) in [#1001](https://github.com/cncjs/cncjs/pull/1001)

  Record every autolevel probe measurement at the intended grid node's XY instead of the machine-reported XY, which is quantised by the motor steps and splits grid lines into near-duplicates.

- feat: show a progress bar for the running G-code job by [@thcasssio](https://github.com/thcasssio) in [#1005](https://github.com/cncjs/cncjs/pull/1005)
- fix(grbl): parse and maintain `Pn:` and `A:` status fields by [@gargamel778](https://github.com/gargamel778) in [#1013](https://github.com/cncjs/cncjs/pull/1013)

  The Grbl status parser now supports the letter-valued status fields introduced in Grbl v1.1 while preserving legacy Grbl 0.9 parsing:

  - `Pn:<letters>` input pin states and `A:<letters>` accessory states are parsed without broadening comma-separated numeric fields, so v0.9 field boundaries remain unchanged.
  - When Grbl omits `Pn:`, `pinState` is cleared because no input pin is active.
  - `A:` is treated as a snapshot only when Grbl reports `Ov:`. It is preserved between override refreshes, and cleared when the next `Ov:` report omits `A:` because all accessories are off.

## 1.11.4

### Patch Changes

- fix: Marlin G28 homing fix by [@cheton](https://github.com/cheton) in [#1006](https://github.com/cncjs/cncjs/pull/1006)

## 1.11.3

### Patch Changes

- feat: preserves partially typed Console commands while serial, jog, and macro output is rendered by [@cheton](https://github.com/cheton) in [#994](https://github.com/cncjs/cncjs/pull/994)

## 1.11.2

### Patch Changes

- feat: add bilinear interpolation to autolevel plugin by [@sormy](https://github.com/sormy) in [#990](https://github.com/cncjs/cncjs/pull/990)

- feat: make text labels crispier on hi-DPI screens by [@sormy](https://github.com/sormy) in [#992](https://github.com/cncjs/cncjs/pull/992)

## 1.11.1

### Patch Changes

- fix(visualizer): align machine limits, pivot, and orbit center with machine profiles by [@cheton](https://github.com/cheton) in [#979](https://github.com/cncjs/cncjs/pull/979)

## 1.11.0

### Minor Changes

- feat(autolevel): add `Autolevel` widget for surface probing and Z-axis compensation by [@cheton](https://github.com/cheton) in [#959](https://github.com/cncjs/cncjs/pull/959)

- feat(docker): add multi-arch image build for `linux/arm64` by [@rodrigomenezes](https://github.com/rodrigomenezes) in [#966](https://github.com/cncjs/cncjs/pull/966)

### Patch Changes

- fix(autolevel): UI polish, i18n fixes, and Electron first-launch white screen by [@cheton](https://github.com/cheton) in [#967](https://github.com/cncjs/cncjs/pull/967)
