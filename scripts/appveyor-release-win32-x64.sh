#!/bin/bash

FILE=$1
if [[ -z "$FILE" ]]; then
    echo "The file is not specified."
    exit 1;
fi

RELEASE="cnc-${APPVEYOR_TAG_NAME:-${APPVEYOR_REPO_BRANCH:-local}}"
USER=cheton
REPO=cnc-builds
TAG="${RELEASE}-latest"

scripts/github-release.sh \
    --user="$USER" \
    --repo="$REPO" \
    --tag="$TAG" \
    --name="${RELEASE}-win32-x64.zip" \
    --file="$FILE"
