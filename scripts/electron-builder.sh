#!/bin/bash

PLATFORM=${PLATFORM:-all}
ARCH=${ARCH:-all}
ELECTRON_VERSION=$(./node_modules/.bin/electron --version)

pushd dist/cnc
echo "Cleaning up dist/cnc/node_modules..."
rm -rf node_modules
echo "Installing packages..."
npm install --production
popd

# https://github.com/electron/electron-rebuild/issues/59
rm -f dist/cnc/node_modules/serialport/build/Release/serialport.node

echo "Rebuilding native modules..."
./node_modules/.bin/electron-rebuild \
    --version=${ELECTRON_VERSION:1} \
    --pre-gyp-fix \
    --module-dir=dist/cnc/node_modules \
    --electron-prebuilt-dir=node_modules/electron-prebuilt/ \
    --which-module=serialport

# Resolve an issue of System.IO.PathTooLongException for Win32 build
rm -rf dist/cnc/node_modules/serialport/node_modules/node-pre-gyp

./node_modules/.bin/build \
    --dist \
    --platform=${PLATFORM} \
    --arch=${ARCH}
