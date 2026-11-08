# BR0 browser baseline — 2026-09-13

## Result

Blocked before browser execution. The required browser runtime reported no available browser backends (`agent.browsers.list()` returned `[]`), so no browser, screenshot, accessible-snapshot, HTML snapshot, selector, or gate result is claimed.

The requested Stop correction was recorded for the next run: use the long fixture and verify `Run → Pause → Stop` with state before/after each action. Keep `Run → Pause → Resume` as a separate flow; Stop is expected enabled only while workflow state is `paused`.

## Lifecycle evidence

- `/tmp/cncjs-browser-test.cncrc` copied from `docs/testing/configs/browser-test.cncrc`.
- `/tmp/cncjs-browser-watch` rebuilt from `src/app/test/fixtures/browser/br0-watch-tree`.
- Fixture counts: 100 directories, 4,900 files, 5,000 payload nodes.
- Fixture SHA-256: `br0-small.gcode` = `08c3db3f70e0f311bd9f30033191578605b7b8c240a8a2fcb2952fd261a842cd`; `br0-large-100000.gcode` = `45397ed84742e57ba0941be8c0035736bb5d39e6903a6cf7c5848ba985b2f19c`.
- Config SHA-256: `df522207eaeca775e98f6a061b105befddeed64d88caff069eed1ac7dba71327`.
- The requested `CONFIG_PATH=/tmp/cncjs-browser-test.cncrc SUPPRESS_WEBGL_WARNING=1 yarn dev` lifecycle compiled successfully, then was stopped by this run.

## Cleanup

- Port 8000: absent.
- Port 8080: absent.
- `/tmp/ttyGRBL`: absent.

