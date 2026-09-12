# cncjs

## 1.11.5

### Patch Changes

- c8e273d: feat: add support for uploading files to the watch directory

  Rework the Watch Directory modal: add an "Add" button and a dropzone to upload files to the configured watch directory, with an upload progress indicator. The file tree updates in real time via server push events and also provides a Refresh button.

- 78b6823: fix(autolevel): store probe measurements at the intended grid node's XY

  Record every autolevel probe measurement at the intended grid node's XY instead of the machine-reported XY, which is quantised by the motor steps and splits grid lines into near-duplicates.

- 4132c2a: feat: show a progress bar for the running G-code job
- 190330b: fix(grbl): parse and maintain `Pn:` and `A:` status fields

  The Grbl status parser now supports the letter-valued status fields introduced in Grbl v1.1 while preserving legacy Grbl 0.9 parsing:

  - `Pn:<letters>` input pin states and `A:<letters>` accessory states are parsed without broadening comma-separated numeric fields, so v0.9 field boundaries remain unchanged.
  - When Grbl omits `Pn:`, `pinState` is cleared because no input pin is active.
  - `A:` is treated as a snapshot only when Grbl reports `Ov:`. It is preserved between override refreshes, and cleared when the next `Ov:` report omits `A:` because all accessories are off.

## 1.11.4

### Patch Changes

- cb58469: fix: Marlin G28 homing fix

## 1.11.3

### Patch Changes

- e140286: feat: preserves partially typed Console commands while serial, jog, and macro output is rendered

## 1.11.2

### Patch Changes

- feat: add bilinear interpolation to autolevel plugin by @sormy in [#990](https://github.com/cncjs/cncjs/pull/990)

- feat: make text labels crispier on hi-DPI screens by @sormy in [#992](https://github.com/cncjs/cncjs/pull/992)

## 1.11.1

### Patch Changes

- 0f1b71b: - fix(visualizer): align machine limits, pivot, and orbit center with machine profiles by [@cheton](https://github.com/cheton) in [#979](https://github.com/cncjs/cncjs/pull/979)

## 1.11.0

### Minor Changes

- feat(autolevel): add `Autolevel` widget for surface probing and Z-axis compensation by [@cheton](https://github.com/cheton) in [#959](https://github.com/cncjs/cncjs/pull/959)

- feat(docker): add multi-arch image build for `linux/arm64` by [@rodrigomenezes](https://github.com/rodrigomenezes) in [#966](https://github.com/cncjs/cncjs/pull/966)

### Patch Changes

- fix(autolevel): UI polish, i18n fixes, and Electron first-launch white screen by [@cheton](https://github.com/cheton) in [#967](https://github.com/cncjs/cncjs/pull/967)
