#!/bin/bash

mkdir -p output
rm -rf output/*

pushd src
mkdir -p ../output/cncjs/
cp -af package.json ../output/cncjs/
cross-env NODE_ENV=development babel "*.js" \
    --config-file ../babel.config.js \
    --out-dir ../output/cncjs
cross-env NODE_ENV=development babel "electron-app/**/*.js" \
    --config-file ../babel.config.js \
    --out-dir ../output/cncjs/electron-app
popd
