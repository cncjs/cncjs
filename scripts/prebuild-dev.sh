#!/bin/bash

mkdir -p output
rm -rf output/*

pushd src
cp -af package.json ../output/
babel -d ../output *.js electron-app/**/*.js
popd
