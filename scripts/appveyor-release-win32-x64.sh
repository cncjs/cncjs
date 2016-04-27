#!/bin/bash

pushd output
7z.exe -a cncjs-win32-x64.zip cncjs-win32-x64/
popd

scripts/github-release.sh \
    --user="cheton" \
    --repo="cnc-builds" \
    --tag="${APPVEYOR_TAG_NAME:-$APPVEYOR_REPO_BRANCH}-win32-x64" \
    --description="AppVeyor build: $APPVEYOR_BUILD_VERSION" \
    --name="cncjs-${APPVEYOR_TAG_NAME:-$APPVEYOR_REPO_BRANCH}-win32-x64.zip" \
    --file="output/cncjs-win32-x64.zip"
