#!/bin/bash

mkdir -p dist
rm -rf dist/*

npm run package-sync

pushd src
if [ ! -z "$CI_BUILD_NUMBER" ]; then
    npm version ${npm_package_version}-${CI_BUILD_NUMBER};
fi
mkdir -p ../dist/cnc/
cp -af package.json ../dist/cnc/
babel -d ../dist/cnc/ *.js electron-app/**/*.js
popd
