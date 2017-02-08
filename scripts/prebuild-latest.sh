#!/bin/bash

abbrev_commit=`git log -1 --format=%h`

mkdir -p output
rm -rf output/*

npm run pkgsync

pushd src
npm version ${npm_package_version}-latest-${abbrev_commit}
mkdir -p ../dist/cnc/
cp -af package.json ../dist/cnc/
babel -d ../dist/cnc/ *.js desktop/**/*.js
popd
