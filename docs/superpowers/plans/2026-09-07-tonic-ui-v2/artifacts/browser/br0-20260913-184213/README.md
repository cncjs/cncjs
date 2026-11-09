# BR0 browser baseline — blocked

Date: 2026-09-13 (Asia/Taipei)
Source revision: `62ea82cab0c680596ac89318b100be15133f1b63` (recorded start HEAD)
Session: `br0-20260913-184213`

## Blocker

BR0 remains `in_progress` and blocking. The required single `yarn dev` lifecycle cannot start because the simulator dependency `socat` is not installed. The sandboxed run also cannot bind the required addresses. Exact errors:

```text
Error: socat is not installed
Install with: sudo apt-get install socat
Error: listen EPERM: operation not permitted 0.0.0.0:8000
[webpack-cli] Error: listen EPERM: operation not permitted 0.0.0.0:8080
```

Unblock condition: provide `socat` and an execution context permitted to bind `0.0.0.0:8000` and `0.0.0.0:8080`, then rerun the exact lifecycle and browser procedure.

## Commands and results

All commands were run from the repository root. No credentials, tokens, storage state, or private files were used.

```text
cp docs/testing/configs/browser-test.cncrc /tmp/cncjs-browser-test.cncrc
mkdir -p /tmp/cncjs-browser-watch
yarn build-dev                                      exit 0
CONFIG_PATH=/tmp/cncjs-browser-test.cncrc SUPPRESS_WEBGL_WARNING=1 yarn dev  exit 1 (sandbox)
CONFIG_PATH=/tmp/cncjs-browser-test.cncrc SUPPRESS_WEBGL_WARNING=1 yarn dev  exit 1 (elevated retry)
```

The first attempted background launch was rejected before startup with `nice(5) failed: operation not permitted`; it created no child lifecycle, ports, or tty. The two tracked foreground lifecycle runs were stopped/terminated by their own `concurrently` cleanup after the simulator failure.

Build warning: webpack completed successfully with existing ESLint warnings (14 warnings, 0 errors). Node emitted `DEP0180 fs.Stats` deprecation warnings.

## Fixtures

Durable synthetic fixtures are under `src/app/test/fixtures/browser/`; `br0-small.gcode` was preserved. The large fixture has 100,001 newline-terminated lines (headers/trailer plus 99,998 motion records). The watch fixture has 100 directories and 4,900 files, i.e. 5,000 payload nodes excluding the root directory.

Runtime watch data was copied to `/tmp/cncjs-browser-watch`. The active config is `/tmp/cncjs-browser-test.cncrc`; it has no users and uses anonymous sign-in.

See `results.json` for SHA-256 hashes and assertions.

## Browser coverage

No browser runner, browser session, accessible snapshot, screenshot, console capture, viewport test, connection workflow, G-code upload, run/pause/resume/stop sequence, jog test, disconnect test, or large/watch UI test was executed. Browser details are therefore unavailable. Required browser unblock: the server must be reachable at `http://127.0.0.1:8080` with the Grbl simulator bridge available at `/tmp/ttyGRBL`.

## Cleanup

After lifecycle exit, checks found no listeners on TCP 8000 or 8080 and no `/tmp/ttyGRBL` path. Only the processes started by this worker were stopped; no separate simulator/server lifecycle was started.
