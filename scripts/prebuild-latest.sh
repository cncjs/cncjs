#!/bin/bash

mkdir -p dist
rm -rf dist/*

npm run package-sync
commits_count=`git rev-list --count master`

pushd src
npm version ${npm_package_version}-${commits_count}
mkdir -p ../dist/cnc/
cp -af package.json ../dist/cnc/
babel -d ../dist/cnc/ *.js electron-app/**/*.js
popd
