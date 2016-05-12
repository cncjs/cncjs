#!/bin/bash

gulp pkg-sync

pushd src
mkdir -p ../dist/cnc/
cp -af package.json ../dist/cnc/
babel -d ../dist/cnc/ *.js desktop/**/*.js
popd
