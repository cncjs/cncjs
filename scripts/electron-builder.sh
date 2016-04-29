#!/bin/bash

PLATFORM=${PLATFORM:-all}
ARCH=${ARCH:-all}

pushd dist/cnc
echo "Cleaning up dist/cnc/node_modules..."
rm -rf node_modules
echo "Installing packages..."
npm install --production
popd

scripts/electron-rebuild.sh

./node_modules/.bin/build \
    --platform=${PLATFORM} \
    --arch=${ARCH}
