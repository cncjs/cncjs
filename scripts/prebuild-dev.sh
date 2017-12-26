#!/bin/bash

mkdir -p output
rm -rf output/*

npm run package-sync

pushd src
cp -af package.json ../output/
babel -d ../output *.js electron-app/**/*.js
popd
