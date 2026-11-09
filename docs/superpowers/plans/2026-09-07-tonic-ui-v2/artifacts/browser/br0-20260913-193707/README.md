# BR0 browser retry artifacts

This attempt used the prescribed temporary config and watch-tree setup from the repository root. The in-app browser backend was unavailable, so the authorized direct Playwright fallback used `/Applications/ChatGPT.app/Contents/Resources/cua_node/lib/node_modules/playwright` and the bundled Playwright Chromium 151 executable from `~/Library/Caches/ms-playwright`; system Chrome was not used.

Command log:

1. `cp docs/testing/configs/browser-test.cncrc /tmp/cncjs-browser-test.cncrc`
2. `mkdir -p /tmp/cncjs-browser-watch` and copied `src/app/test/fixtures/browser/br0-watch-tree` into it; observed 4,900 files.
3. `CONFIG_PATH=/tmp/cncjs-browser-test.cncrc SUPPRESS_WEBGL_WARNING=1 yarn dev`
4. Navigated to `http://127.0.0.1:8080/#/workspace` at 1440x900, DPR 1, light theme.
5. Clicked existing `Choose a port`; attempted the visible `/tmp/ttyGRBL` entry.

Large fixture stats recorded before browser actions: 100,001 newline-delimited lines (100,000 G-code lines plus terminal newline), SHA-256 `45397ed84742e57ba0941be8c0035736bb5d39e6903a6cf7c5848ba985b2f19c`.

Result: blocked during port selection because the option was not exposed as `role=option` within the 8-second action timeout. See `checkpoint-blocker.md`. No remaining gate is claimed.
