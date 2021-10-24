#!/bin/bash

mkdir -p output/cncjs/app
mkdir -p output/cncjs/server

cp -af src/app/{favicon.ico,i18n,images,assets} output/cncjs/app/
cp -af src/server/{i18n,views} output/cncjs/server/
