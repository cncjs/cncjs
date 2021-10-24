#!/bin/bash

# Change a forward slash to another character
# - master       -> master
# - feature/next -> feature-next
# - v1.0         -> v1.0
DOCKER_BRANCH_TAG=$(echo $CI_BRANCH | sed -e 's/\//-/g')
echo "DOCKER_BRANCH_TAG=$DOCKER_BRANCH_TAG"

DOCKER_REPO=cncjs/cncjs
echo "DOCKER_REPO=$DOCKER_REPO"

echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin
docker build -f Dockerfile -t $DOCKER_REPO:$DOCKER_BRANCH_TAG .

docker images
docker push $DOCKER_REPO:$DOCKER_BRANCH_TAG
