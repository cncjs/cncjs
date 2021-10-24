#!/bin/bash

mkdir -p dist/cncjs/app
mkdir -p dist/cncjs/server

cp -af src/app/{favicon.ico,i18n,images,assets} dist/cncjs/app/
cp -af src/server/{i18n,views} dist/cncjs/server/
