# BR0 browser rerun — 2026-09-13 20:06 +08:00

## Scope

Requested remaining BR0 browser gates. Browser-only run; no source edits and Jest intentionally excluded per user instruction.

## Lifecycle

Command from repository root:

```bash
cp docs/testing/configs/browser-test.cncrc /tmp/cncjs-browser-test.cncrc
mkdir -p /tmp/cncjs-browser-watch
CONFIG_PATH=/tmp/cncjs-browser-test.cncrc SUPPRESS_WEBGL_WARNING=1 yarn dev
```

The lifecycle compiled successfully and started the Grbl simulator, frontend on `8000`/`8080`, backend, and `/tmp/ttyGRBL`. It was stopped with Ctrl-C by the owner of this run.

Observed server connection log: `/tmp/ttyGRBL`, Grbl, `115200`, anonymous browser socket connected. This is setup evidence only, not browser-gate evidence.

## Fixtures

| Fixture | SHA-256 / count |
|---|---|
| `br0-small.gcode` | `08c3db3f70e0f311bd9f30033191578605b7b8c240a8a2fcb2952fd261a842cd` |
| `br0-large-100000.gcode` | `45397ed84742e57ba0941be8c0035736bb5d39e6903a6cf7c5848ba985b2f19c` / 100001 lines |
| `br0-watch-tree` | 4900 files, 101 directories including root |

## Gate results

All browser gates below are **not run in this session**. No screenshots, ARIA/HTML snapshots, browser console/page-error logs, or workflow result JSON were collected for this run.

| Gate | Result | Blocker |
|---|---|---|
| React Select `/tmp/ttyGRBL` + `115200` + connect | NOT RUN | No Luna medium browser worker available |
| Small fixture upload / no runtime errors | NOT RUN | No Luna medium browser worker available |
| Long fixture Run → Pause → Stop | NOT RUN | No Luna medium browser worker available |
| Long fixture Run → Pause → Resume | NOT RUN | No Luna medium browser worker available |
| Jog press/release | NOT RUN | No Luna medium browser worker available |
| Disconnect / disabled controls | NOT RUN | No Luna medium browser worker available |
| Watch Directory 5000-node timing/rendering | NOT RUN | No Luna medium browser worker available |
| Viewport 1440×900 | NOT RUN | No Luna medium browser worker available |
| Viewport 768×900 | NOT RUN | No Luna medium browser worker available |

## Browser ownership blocker

`EXECUTION.md` requires every browser test, screenshot, accessible snapshot, and Playwright/browser-runner operation to be performed by `gpt-5.6-luna` with `reasoning_effort: "medium"`. This session exposes no subagent/worker dispatch capability, so the main agent did not substitute direct browser automation.

BR0 therefore remains blocking and must not be marked complete.

## Cleanup

After Ctrl-C, verify with:

```bash
lsof -nP -iTCP:8000 -sTCP:LISTEN
lsof -nP -iTCP:8080 -sTCP:LISTEN
test ! -e /tmp/ttyGRBL
```

Expected/observed cleanup: no listeners and `/tmp/ttyGRBL` absent.
