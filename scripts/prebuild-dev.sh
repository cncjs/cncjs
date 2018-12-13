#!/bin/bash

mkdir -p output
rm -rf output/*

pushd src
cp -af package.json ../output/
babel --config-file ../babel.config.js -d ../output *.js electron-app/**/*.js
popd
