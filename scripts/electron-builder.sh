#!/bin/bash

__dirname="$(CDPATH= cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
electron_version=$(electron --version)

display_usage() {
    echo
    echo "Usage: "`basename $0`" [options]"
    echo
    echo "Options"
    echo
    echo "  -h, --help      output usage information"
    echo "  -p, --platform  platform=linux|darwin|win32"
    echo "  -a, --arch      arch=ia32|x64"
    echo
}

if [ $# -le 1 ]; then
    display_usage
    exit 1
fi 

if [[ ( $# == "--help") ||  $# == "-h" ]]; then
    display_usage
    exit 0
fi

for i in "$@"
do
case $i in
    -p) platform="$2"; shift 2;;
    -a) arch="$2"; shift 2;;

    --platform=*) platform="${i#*=}"; shift 1;;
    --arch=*) arch="${i#*=}"; shift 1;;

    -*) echo "unknown option: $i" >&2; exit 1;;
    *);;
esac
done

if [[ -z "$platform" || -z "$arch" ]]; then
    display_usage
    exit 1
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

npm run electron-builder -- \
    --dist \
    --platform=${platform} \
    --arch=${arch}
