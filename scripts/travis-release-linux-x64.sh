#!/bin/bash

RELEASE=${TRAVIS_TAG:-${TRAVIS_BRANCH:-latest}}-linux-x64

pushd output
zip -q -r cncjs-linux-x64.zip cncjs-linux-x64/
popd

scripts/github-release.sh \
    --user="cheton" \
    --repo="cnc-builds" \
    --tag="$RELEASE" \
    --description="Travis build: ${TRAVIS_BUILD_NUMBER}" \
    --name="cncjs-${RELEASE}.zip" \
    --file="output/cncjs-linux-x64.zip"
