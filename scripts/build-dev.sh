#!/bin/bash

echo "Syncing yarn packages..."

yarn run package-sync

echo "Clearing output directory..."
mkdir -p output
rm -rf output/*

pushd src

echo "Copying build files..."
mkdir -p ../output/cncjs/
cp -af package.json ../output/cncjs/


echo "Running babel..."

cross-env NODE_ENV=development babel "*.js" \
    --config-file ../babel.config.js \
    --out-dir ../output/cncjs
cross-env NODE_ENV=development babel "electron-app/**/*.js" \
    --config-file ../babel.config.js \
    --out-dir ../output/cncjs/electron-app

popd

babel -d output/cncjs/server src/server

echo "Scanning server with i18Next..."
i18next-scanner --config i18next-scanner.server.config.js \"src/server/**/*.{html,js,jsx}\" \"!src/server/i18n/**\" \"!**/node_modules/**\"

echo "Running WebPack..."
cross-env NODE_ENV=development NODE_OPTIONS=--openssl-legacy-provider webpack-cli --config webpack.config.development.js

echo "Scanning client with i18Next..."
i18next-scanner --config i18next-scanner.app.config.js \"src/app/**/*.{html,js,jsx}\" \"!src/app/i18n/**\" \"!**/node_modules/**\"

echo "Creating output files..."
mkdir -p output/cncjs/app
mkdir -p output/cncjs/server

cp -af src/app/{favicon.ico,i18n,images,assets} output/cncjs/app/
cp -af src/server/{i18n,views} output/cncjs/server/

echo "Finished!"
