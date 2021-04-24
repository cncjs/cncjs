#!/bin/bash

__dirname="$(CDPATH= cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
electron_version=$(electron --version)

display_usage() {
    yarn electron-builder -- --help
}

if [ $# -le 1 ]; then
    display_usage
    exit 1
fi 

if [[ ( $# == "--help") ||  $# == "-h" ]]; then
    display_usage
    exit 0
fi

pushd "$__dirname/../dist/cncjs"
echo "Cleaning up \"`pwd`/node_modules\""
rm -rf node_modules
echo "Installing packages..."
yarn --production
popd

#echo "Rebuild native modules using electron ${electron_version}"
#npm run electron-rebuild -- \
#    --version=${electron_version:1} \
#    --module-dir=dist/cncjs \
#    --which-module=serialport

yarn electron-builder install-app-deps

cross-env USE_HARD_LINKS=false yarn electron-builder -- "$@"
