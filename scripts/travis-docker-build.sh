#!/bin/bash

# Change a forward slash to another character
# - master       -> master
# - feature/next -> feature-next
# - v1.0         -> v1.0
DOCKER_BRANCH_TAG=$(echo $TRAVIS_BRANCH | sed -e 's/\//-/g')
echo "DOCKER_BRANCH_TAG=$DOCKER_BRANCH_TAG"

# e.g. travis-1000.4cb69ef5
DOCKER_BUILD_TAG=travis-$TRAVIS_BUILD_NUMBER.${TRAVIS_COMMIT::8}
echo "DOCKER_BUILD_TAG=$DOCKER_BUILD_TAG"

DOCKER_REPO=cncjs/cncjs
echo "DOCKER_REPO=$DOCKER_REPO"

echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin
docker build -f Dockerfile -t $DOCKER_REPO:$DOCKER_BRANCH_TAG .
#docker tag $DOCKER_REPO:$DOCKER_BUILD_TAG $DOCKER_REPO:$DOCKER_BRANCH_TAG
#if [ ! -z "$TRAVIS_TAG" ]; then
#    docker tag -f $DOCKER_REPO:$DOCKER_BUILD_TAG $DOCKER_REPO:$TRAVIS_TAG;
#fi
docker images
docker push $DOCKER_REPO
