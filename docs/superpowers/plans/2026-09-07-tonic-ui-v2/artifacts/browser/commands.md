# BR0 commands

```bash
yarn build-dev
node grbl-simulator/grbl-server.js 8888
node grbl-simulator/serial-bridge.js 8888 /tmp/ttyCNCjsMigration
NODE_ENV=development ./bin/cncjs --host 127.0.0.1 --port 8000 \
  --config /tmp/cncjs-migration.cncrc \
  --watch-directory /tmp/cncjs-migration-watch
WEBPACK_DEV_SERVER_HOST=127.0.0.1 PROXY_TARGET=http://127.0.0.1:8000 \
  yarn start-app-dev --port 8080
playwright cli -s=cncjs-br0 open http://127.0.0.1:8080 --browser chromium
playwright cli -s=cncjs-br0 snapshot
playwright cli -s=cncjs-br0 screenshot --filename br0-final-workspace.png --full-page
```

The simulator, bridge, backend, and app were started in separate terminal
sessions. The config and fixtures were generated under `/tmp`; no user
`~/.cncrc`, browser storage state, password, or token was committed.
