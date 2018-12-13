#!/bin/bash

mkdir -p dist
rm -rf dist/*

pushd src
mkdir -p ../dist/cnc/
cp -af package.json ../dist/cnc/
babel --config-file ../babel.config.js -d ../dist/cnc/ *.js electron-app/**/*.js
popd
