#!/bin/bash

export NODE_OPTIONS=--openssl-legacy-provider
yarn install
yarn build-prod

cd dist/cncjs/
touch yarn.lock
yarn install
cd ..
cd ..
bin/cncjs