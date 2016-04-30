#!/bin/bash

display_usage() {
    echo
    echo "Usage: "`basename $0`" [options]"
    echo
    echo "Options"
    echo
    echo "  -u, --user         Github user (required if \$GITHUB_USER not set)"
    echo "  -r, --repo         Github repo (required if \$GITHUB_REPO not set)"
    echo "  -h, --help         output usage information"
    echo "  -t, --tag          Git tag for the release (*)"
    echo "  -n, --name         Name of the file (*)"
    echo "  -f, --file         File to upload (*)"
    echo
}

if [ $# -le 1 ]; then
    display_usage
    exit 1
fi 

if [[ ( $# == "--help") ||  $# == "-h" ]]; then
    display_usage
    exit 0
fi

for i in "$@"
do
case $i in
    -u) GITHUB_USER="$2"; shift 2;;
    -r) GITHUB_REPO="$2"; shift 2;;
    -t) TAG="$2"; shift 2;;
    -n) NAME="$2"; shift 2;;
    -f) FILE="$2"; shift 2;;

    --user=*) GITHUB_USER="${i#*=}"; shift 1;;
    --repo=*) GITHUB_REPO="${i#*=}"; shift 1;;
    --tag=*) TAG="${i#*=}"; shift 1;;
    --name=*) NAME="${i#*=}"; shift 1;;
    --file=*) FILE="${i#*=}"; shift 1;;

    -*) echo "unknown option: $i" >&2; exit 1;;
    *);;
esac
done

if [[ -z "$TAG" || -z "$NAME" || -z "$FILE" ]]; then
    display_usage
    exit 1
fi

# Commandline app to create and edit releases on Github (and upload artifacts)
# https://github.com/cheton/github-release

DESCRIPTION=`git log -1 --date=iso`

echo "github-release info --tag=$TAG"
github-release -q info \
    --user $GITHUB_USER \
    --repo $GITHUB_REPO \
    --tag "$TAG"

# Compare commit hash
GREP_COMMIT_HASH=`github-release -q info -u $GITHUB_USER -r $GITHUB_REPO -t "$TAG" | grep 'commit '`
PREV_COMMIT_HASH=${GREP_COMMIT_HASH##* }
COMMIT_HASH=`git log -1 --format=%H`

if [[ ! -z "$PREV_COMMIT_HASH" && "$PREV_COMMIT_HASH" != "$COMMIT_HASH" ]]; then
    # Remove previous release tag
    echo "github-release delete --tag=$TAG"
    github-release -q delete \
        --user $USER \
        --repo $REPO \
        --tag $TAG \
        > /dev/null 2>&1
fi

echo "github-release release --tag=$TAG"
github-release -q release \
    --user $GITHUB_USER \
    --repo $GITHUB_REPO \
    --tag "$TAG" \
    --name $TAG \
    --description "${DESCRIPTION:-$TAG}" \
    --pre-release \
    > /dev/null 2>&1

echo "github-release edit --tag=$TAG"
github-release -q edit \
    --user $GITHUB_USER \
    --repo $GITHUB_REPO \
    --tag "$TAG" \
    --name $TAG \
    --description "${DESCRIPTION:-$TAG}" \
    > /dev/null 2>&1

echo "github-release upload --tag=$TAG --file=$FILE"
github-release -q upload \
    --user $GITHUB_USER \
    --repo $GITHUB_REPO \
    --tag "$TAG" \
    --name "$NAME" \
    --file "$FILE" \
    --replace \
    > /dev/null 2>&1

echo "github-release info --tag=$TAG"
github-release -q info \
    --user $GITHUB_USER \
    --repo $GITHUB_REPO \
    --tag "$TAG"
