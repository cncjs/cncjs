#!/bin/bash

PLATFORM=${PLATFORM:-all}
ARCH=${ARCH:-all}
VERSION=0.37.6

VERSION=${VERSION} scripts/electron-rebuild.sh

./node_modules/.bin/electron-packager dist/cncjs \
    --out=output \
    --overwrite \
    --platform=${PLATFORM} \
    --arch=${ARCH} \
    --version=${VERSION}
