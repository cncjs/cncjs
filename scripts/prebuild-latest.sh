#!/bin/bash

gulp pkg-sync

pushd src
npm version $npm_package_version-latest
mkdir -p dist/cnc
cp -af package.json ../dist/cnc
babel -d ../dist/cnc *.js
popd
