# Commands and exit status

Working directory: `/Users/cheton_wu/Code/cncjs/cncjs-cheton`

| Command / action | Exit status |
|---|---:|
| `cp docs/testing/configs/browser-test.cncrc /tmp/cncjs-browser-test.cncrc` | 0 |
| rebuild `/tmp/cncjs-browser-watch` from `src/app/test/fixtures/browser/br0-watch-tree` | 0 |
| `CONFIG_PATH=/tmp/cncjs-browser-test.cncrc SUPPRESS_WEBGL_WARNING=1 yarn dev` | 0 on Ctrl-C graceful shutdown |
| in-app browser discovery (`get("iab")`) | unavailable: no instance |
| direct Playwright controlled Chromium launch | 0 |
| navigate Workspace and capture 1440×900 / 768×900 evidence | 0 |
| React Select port via visible parent control, exact `/tmp/ttyGRBL` option | 0 |
| upload `src/app/test/fixtures/browser/br0-small.gcode` | 0 |
| Run → Pause → Resume | 0 |
| bounded Stop click on completed short fixture | 1 / timeout; Stop disabled |
| final process/port/device verification | 0 |

No source, ledger, plan, or package files were modified. No commit was made.
