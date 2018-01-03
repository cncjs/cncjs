#!/bin/bash

rev=`git rev-list --count HEAD`

mkdir -p dist
rm -rf dist/*

npm run package-sync

pushd src
npm version ${npm_package_version}-${rev}
mkdir -p ../dist/cnc/
cp -af package.json ../dist/cnc/
babel -d ../dist/cnc/ *.js electron-app/**/*.js
popd
