#!/bin/bash

FILE=$1
if [[ -z "$FILE" ]]; then
    echo "The file is not specified."
    exit 1;
fi

RELEASE="cncjs-${TRAVIS_TAG:-${TRAVIS_BRANCH:-latest}}"
DESCRIPTION=`git log -1 --date=iso`

scripts/github-release.sh \
    --user="cheton" \
    --repo="cnc-builds" \
    --tag="$RELEASE" \
    --description="$DESCRIPTION" \
    --name="${RELEASE}-darwin-x64.zip" \
    --file="$FILE"
