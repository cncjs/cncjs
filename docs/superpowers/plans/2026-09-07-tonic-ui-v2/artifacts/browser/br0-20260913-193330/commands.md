# Commands

```sh
cp docs/testing/configs/browser-test.cncrc /tmp/cncjs-browser-test.cncrc
mv /tmp/cncjs-browser-watch /tmp/cncjs-browser-watch.previous-20260913  # only if the target existed
cp -R src/app/test/fixtures/browser/br0-watch-tree /tmp/cncjs-browser-watch
CONFIG_PATH=/tmp/cncjs-browser-test.cncrc SUPPRESS_WEBGL_WARNING=1 yarn dev
```

Browser setup was attempted through the required browser runtime against `http://127.0.0.1:8080/#/workspace`; no browser backend was available.

