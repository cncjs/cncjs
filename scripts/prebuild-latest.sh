#!/bin/bash

VERSION=${npm_package_version}-$(TZ=UTC date +'%Y%m%d')-${CI_COMMIT_SHORT:-latest}

mkdir -p dist
rm -rf dist/*

pushd src
mkdir -p ../dist/cncjs/
sed 's/\("version": \)".*"/\1"'$VERSION'"/' package.json > package.json.new
mv -f package.json.new package.json
cp -af package.json ../dist/cncjs/
cross-env NODE_ENV=production babel "*.js" \
    --config-file ../babel.config.js \
    --out-dir ../dist/cncjs
cross-env NODE_ENV=production babel "electron-app/**/*.js" \
    --config-file ../babel.config.js \
    --out-dir ../dist/cncjs/electron-app
popd
