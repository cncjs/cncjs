#!/bin/bash

VERSION=${VERSION}

pushd dist/cncjs
npm install --production
popd

rm -f dist/cncjs/node_modules/serialport/build/Release/serialport.node

./node_modules/.bin/electron-rebuild \
    --version=${VERSION} \
    --pre-gyp-fix \
    --module-dir=dist/cncjs/node_modules \
    --electron-prebuilt-dir=node_modules/electron-prebuilt/ \
    --which-module=serialport
