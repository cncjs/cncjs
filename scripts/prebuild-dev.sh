#!/bin/bash

mkdir -p output
rm -rf output/*

pushd src
cp -af package.json ../output/
cross-env NODE_ENV=development babel "*.js" \
    --config-file ../babel.config.js \
    --out-dir ../output
cross-env NODE_ENV=development babel "electron-app/**/*.js" \
    --config-file ../babel.config.js \
    --out-dir ../output/electron-app
popd
