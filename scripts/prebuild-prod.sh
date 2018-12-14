#!/bin/bash

mkdir -p dist
rm -rf dist/*

pushd src
mkdir -p ../dist/cnc/
cp -af package.json ../dist/cnc/
babel "*.js" --config-file ../babel.config.js --out-dir ../dist/cnc
babel "electron-app/**/*.js" --config-file ../babel.config.js --out-dir ../dist/cnc/electron-app
popd
