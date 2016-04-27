#!/bin/bash

RELEASE=${TRAVIS_TAG:-${TRAVIS_BRANCH:-latest}}-darwin-x64

pushd output
zip -q -r cncjs-darwin-x64.zip cncjs-darwin-x64/
popd

scripts/github-release.sh \
    --user="cheton" \
    --repo="cnc-builds" \
    --tag="$RELEASE" \
    --description="Travis build: ${TRAVIS_BUILD_NUMBER}" \
    --name="cncjs-${RELEASE}.zip" \
    --file="output/cncjs-darwin-x64.zip"
