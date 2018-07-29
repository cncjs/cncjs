#!/bin/bash

__dirname="$(CDPATH= cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
electron_version=$(electron --version)

display_usage() {
    npm run electron-builder -- --help
}

if [ $# -le 1 ]; then
    display_usage
    exit 1
fi 

if [[ ( $# == "--help") ||  $# == "-h" ]]; then
    display_usage
    exit 0
fi

pushd "$__dirname/../dist/cnc"
echo "Cleaning up \"`pwd`/node_modules\""
rm -rf node_modules
echo "Installing packages..."
npm install --production
npm dedupe
popd

echo "Rebuild native modules using electron ${electron_version}"
npm run electron-rebuild -- \
    --version=${electron_version:1} \
    --module-dir=dist/cnc \
    --which-module=serialport

cross-env USE_HARD_LINKS=false npm run electron-builder -- "$@"
