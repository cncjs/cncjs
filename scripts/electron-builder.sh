#!/bin/bash

__dirname="$(CDPATH= cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
electron_version=$(electron --version)

display_usage() {
    echo 'Usage: '`basename $0`' [options]'
    echo ''
    echo 'Options:'
    echo '  --version             Show version number  [boolean]'
    echo '  --osx, -o             Build for OS X  [array]'
    echo '  --linux, -l           Build for Linux  [array]'
    echo '  --win, -w, --windows  Build for Windows  [array]'
    echo '  --x64                 Build for x64  [boolean]'
    echo '  --ia32                Build for ia32  [boolean]'
    echo '  --publish, -p         Publish artifacts (to GitHub Releases), see https://goo.gl/WMlr4n  [choices: "onTag", "onTagOrDraft", "always", "never"]'
    echo '  --help                Show help  [boolean]'
    echo ''
    echo 'Project home: https://github.com/electron-userland/electron-builder'
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
# https://github.com/electron/electron-rebuild/issues/59
rm -f node_modules/serialport/build/Release/serialport.node
popd

echo "Rebuilding native modules using electron ${electron_version}"
npm run electron-rebuild -- \
    --version=${electron_version:1} \
    --pre-gyp-fix \
    --module-dir=dist/cnc/node_modules \
    --electron-prebuilt-dir=node_modules/electron-prebuilt/ \
    --which-module=serialport

npm run electron-builder -- "$@"
