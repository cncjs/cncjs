#!/bin/bash

yarn run package-sync

mkdir -p dist
rm -rf dist/*

pushd src
mkdir -p ../dist/cncjs/
cp -af package.json ../dist/cncjs/
cross-env NODE_ENV=production babel "*.js" \
    --config-file ../babel.config.js \
    --out-dir ../dist/cncjs
cross-env NODE_ENV=production babel "electron-app/**/*.js" \
    --config-file ../babel.config.js \
    --out-dir ../dist/cncjs/electron-app
popd

babel -d dist/cncjs/server src/server
i18next-scanner --config i18next-scanner.server.config.js \"src/server/**/*.{html,js,jsx}\" \"!src/server/i18n/**\" \"!**/node_modules/**\"

cross-env NODE_ENV=production NODE_OPTIONS=--openssl-legacy-provider webpack-cli --config webpack.config.production.js
i18next-scanner --config i18next-scanner.app.config.js \"src/app/**/*.{html,js,jsx}\" \"!src/app/i18n/**\" \"!**/node_modules/**\"

mkdir -p dist/cncjs/app
mkdir -p dist/cncjs/server

cp -af src/app/{favicon.ico,i18n,images,assets} dist/cncjs/app/
cp -af src/server/{i18n,views} dist/cncjs/server/
