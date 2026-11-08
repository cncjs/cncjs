# BR0 commands

```sh
cd /Users/cheton_wu/Code/cncjs/cncjs-cheton
cp docs/testing/configs/browser-test.cncrc /tmp/cncjs-browser-test.cncrc
mkdir -p /tmp/cncjs-browser-watch
yarn build-dev
CONFIG_PATH=/tmp/cncjs-browser-test.cncrc SUPPRESS_WEBGL_WARNING=1 yarn dev
```

Results:

- `yarn build-dev`: exit `0`.
- sandboxed exact lifecycle: exit `1`; `socat` missing; `listen EPERM` on ports 8000/8080.
- elevated exact lifecycle retry: exit `1`; `socat` missing; `concurrently` sent SIGTERM to app/server.
- cleanup checks: no listeners on 8000/8080; `/tmp/ttyGRBL` absent.

The prescribed browser command was not run because the required server was unavailable. No system Chrome was used.
