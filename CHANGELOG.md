# cncjs

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
