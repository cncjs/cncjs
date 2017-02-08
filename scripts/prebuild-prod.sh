#!/bin/bash

mkdir -p output
rm -rf output/*

npm run pkgsync

pushd src
mkdir -p ../dist/cnc/
cp -af package.json ../dist/cnc/
babel -d ../dist/cnc/ *.js desktop/**/*.js
popd
