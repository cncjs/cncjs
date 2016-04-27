#!/bin/bash

FILE=$1
RELEASE="cncjs-${APPVEYOR_TAG_NAME:-${APPVEYOR_REPO_BRANCH:-latest}}-win32-x64

if [[ -z "$FILE" ]]; then
    echo "The file is not specified."
    exit 1;
fi

scripts/github-release.sh \
    --user="cheton" \
    --repo="cnc-builds" \
    --tag="$RELEASE" \
    --description="AppVeyor build: $APPVEYOR_BUILD_VERSION" \
    --name="${RELEASE}.zip" \
    --file="$FILE"
