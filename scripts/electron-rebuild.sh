#!/bin/bash

VERSION=${VERSION}

pushd dist/cnc
npm install --production
popd

rm -f dist/cnc/node_modules/serialport/build/Release/serialport.node

./node_modules/.bin/electron-rebuild \
    --version=${VERSION} \
    --pre-gyp-fix \
    --module-dir=dist/cnc/node_modules \
    --electron-prebuilt-dir=node_modules/electron-prebuilt/ \
    --which-module=serialport
