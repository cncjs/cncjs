#!/bin/bash

mkdir -p output
rm -rf output/*

npm run pkgsync

pushd src
cp -af package.json ../output/
babel -d ../output *.js desktop/**/*.js
popd
