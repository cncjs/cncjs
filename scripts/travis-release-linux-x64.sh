#!/bin/bash

FILE=$1
if [[ -z "$FILE" ]]; then
    echo "The file is not specified."
    exit 1;
fi

RELEASE="cnc-${TRAVIS_TAG:-${TRAVIS_BRANCH:-local}}"
USER=cheton
REPO=cnc-builds
TAG="${RELEASE}-latest"

scripts/github-release.sh \
    --user="$USER" \
    --repo="$REPO" \
    --tag="$TAG" \
    --name="${RELEASE}-linux-x64.zip" \
    --file="$FILE"
