#!/bin/bash

mkdir -p output
rm -rf output/*

pushd src
cp -af package.json ../output/
babel "*.js" --config-file ../babel.config.js --out-dir ../output
babel "electron-app/**/*.js" --config-file ../babel.config.js --out-dir ../output/electron-app
popd
