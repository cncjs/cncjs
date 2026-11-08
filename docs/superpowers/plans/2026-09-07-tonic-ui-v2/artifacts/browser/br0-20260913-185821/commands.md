# BR0 checkpoint commands

All commands ran from `/Users/cheton_wu/Code/cncjs/cncjs-cheton`.

```sh
mkdir -p docs/superpowers/plans/2026-09-07-tonic-ui-v2/artifacts/browser/br0-20260913-185821
cp docs/testing/configs/browser-test.cncrc /tmp/cncjs-browser-test.cncrc
mkdir -p /tmp/cncjs-browser-watch
find /tmp/cncjs-browser-watch -mindepth 1 -delete
cp -R src/app/test/fixtures/browser/br0-watch-tree/. /tmp/cncjs-browser-watch/
yarn build-dev
```

Result: exit `0`.

```sh
CONFIG_PATH=/tmp/cncjs-browser-test.cncrc SUPPRESS_WEBGL_WARNING=1 yarn dev
```

Result: one lifecycle only; interrupted by this worker after the browser attempt;
`write_stdin` returned exit `0` after graceful cleanup. It started simulator,
frontend, and backend. The lifecycle logged ports 50930/50931 for the simulator
bridge, frontend `http://localhost:8080`, backend proxy target port 8000, config
`/tmp/cncjs-browser-test.cncrc`, watch directory `/tmp/cncjs-browser-watch`, and
virtual serial device `/tmp/ttyGRBL`.

Browser fallback discovery:

```text
agent.browsers.list() -> []
```

The first default Playwright launch failed because its expected headless-shell
executable was absent. The explicit installed Chrome for Testing launch then ran:

```text
browser=Playwright Chromium 151.0.7922.34
viewport=1440x900 dpr=1 color_scheme=light headless=true
page.goto=http://127.0.0.1:8080
selected
```

The browser command exceeded 30 seconds while attempting the post-selection
connection interaction and had no exit code. It was terminated by the command
timeout. The durable screenshot was written before the blocked interaction.

Cleanup checks: no TCP listener on 8000 or 8080; `/tmp/ttyGRBL` absent.
