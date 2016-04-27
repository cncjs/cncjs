#!/bin/bash

FILE=$1
RELEASE="cncjs-${TRAVIS_TAG:-${TRAVIS_BRANCH:-latest}}-linux-x64"

if [[ -z "$FILE" ]]; then
    echo "The file is not specified."
    exit 1;
fi

scripts/github-release.sh \
    --user="cheton" \
    --repo="cnc-builds" \
    --tag="$RELEASE" \
    --description="Travis build: ${TRAVIS_BUILD_NUMBER}" \
    --name="${RELEASE}.zip" \
    --file="$FILE"
