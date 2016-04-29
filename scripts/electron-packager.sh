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

scripts/electron-rebuild.sh

./node_modules/.bin/electron-packager dist/cnc \
    --out=output \
    --overwrite \
    --platform=${PLATFORM} \
    --arch=${ARCH} \
    --version=${ELECTRON_VERSION:1}
