#!/bin/bash

abbrev_commit=`git log -1 --format=%h`

gulp pkg-sync

pushd src
npm version ${npm_package_version}-latest-${abbrev_commit}
mkdir -p ../dist/cnc/
cp -af package.json ../dist/cnc/
babel -d ../dist/cnc/ *.js
popd
