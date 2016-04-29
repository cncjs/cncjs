#!/bin/bash

ELECTRON_VERSION=$(./node_modules/.bin/electron --version)

# https://github.com/electron/electron-rebuild/issues/59
rm -f dist/cnc/node_modules/serialport/build/Release/serialport.node

./node_modules/.bin/electron-rebuild \
    --version=${ELECTRON_VERSION:1} \
    --pre-gyp-fix \
    --module-dir=dist/cnc/node_modules \
    --electron-prebuilt-dir=node_modules/electron-prebuilt/ \
    --which-module=serialport
