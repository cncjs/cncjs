#!/bin/bash

mkdir -p dist
rm -rf dist/*

npm run package-sync

pushd src
mkdir -p ../dist/cnc/
cp -af package.json ../dist/cnc/
babel -d ../dist/cnc/ *.js electron-app/**/*.js
popd
