#!/bin/bash

export NODE_OPTIONS=--openssl-legacy-provider
cd ..
rm -Rf dist
rm -f ~/.cncrc
rm -fR ~/cncjs_i18n_old
mkdir -p ~/cncjs_i18n_old/{app,server}

cp -R src/app/i18n ~/cncjs_i18n_old/app
cp -R src/server/i18n ~/cncjs_i18n_old/server

yarn install
yarn build-prod
cd dist/cncjs/
touch yarn.lock
yarn install
cd ..
cd ..
bin/cncjs