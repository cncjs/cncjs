# Commands

```sh
cp docs/testing/configs/browser-test.cncrc /tmp/cncjs-browser-test.cncrc
mv /tmp/cncjs-browser-watch /tmp/cncjs-browser-watch-old-<suffix>  # only if present
mkdir -p /tmp/cncjs-browser-watch
cp -R src/app/test/fixtures/browser/br0-watch-tree/. /tmp/cncjs-browser-watch/
CONFIG_PATH=/tmp/cncjs-browser-test.cncrc SUPPRESS_WEBGL_WARNING=1 yarn dev
node docs/superpowers/plans/2026-09-07-tonic-ui-v2/artifacts/browser/br0-20260913-194320-30867/run-br0.js
```

The runner required `/Applications/ChatGPT.app/Contents/Resources/cua_node/lib/node_modules/playwright` and launched the bundled executable under `/Users/cheton_wu/Library/Caches/ms-playwright`; it did not launch `/Applications/Google Chrome.app`. It used a fresh Playwright profile and the requested hash route.

Cleanup stopped the runner/browser and the lifecycle started by this retry, then ran:

```sh
lsof -nP -iTCP:8000 -sTCP:LISTEN
lsof -nP -iTCP:8080 -sTCP:LISTEN
ls -l /tmp/ttyGRBL
```

The final results are recorded in `results.json`; raw output is in `setup.log`, `lifecycle.log`, `browser.log`, `runner.stdout.log`, and `cleanup.log`.
