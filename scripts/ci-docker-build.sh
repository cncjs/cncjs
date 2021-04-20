#!/bin/bash

DOCKER_REPO=cncjs/cncjs
DOCKER_BRANCH_TAG=`if [ "$CI_BRANCH" == "master" ]; then echo -n "latest"; else echo -n "$CI_BRANCH"; fi`

echo "DOCKER_REPO=$DOCKER_REPO"
echo "DOCKER_BRANCH_TAG=$DOCKER_BRANCH_TAG"
echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin
docker build -f Dockerfile -t $DOCKER_REPO:$DOCKER_BRANCH_TAG .
docker images
docker push $DOCKER_REPO
