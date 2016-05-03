#!/bin/bash

BABEL_CLI=`pwd`/node_modules/.bin/babel

pushd src

mkdir -p ../dist/cnc
cp -af package.json ../dist/cnc
$BABEL_CLI -d ../dist/cnc *.js

popd
