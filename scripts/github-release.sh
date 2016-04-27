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
    echo "  -d, --description  Description of the release (defaults to tag)"
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
    -d) DESCRIPTION="$2"; shift 2;;
    -n) NAME="$2"; shift 2;;
    -f) FILE="$2"; shift 2;;

    --user=*) GITHUB_USER="${i#*=}"; shift 1;;
    --repo=*) GITHUB_REPO="${i#*=}"; shift 1;;
    --tag=*) TAG="${i#*=}"; shift 1;;
    --description=*) DESCRIPTION="${i#*=}"; shift 1;;
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

echo "before_github_release:"
github-release info \
    --user $GITHUB_USER \
    --repo $GITHUB_REPO \
    --tag "$TAG"

github-release -q release \
    --user $GITHUB_USER \
    --repo $GITHUB_REPO \
    --tag "$TAG" \
    --name $TAG \
    --description "${DESCRIPTION:-$TAG}" \
    --pre-release \
    > /dev/null 2>&1

github-release -q edit \
    --user $GITHUB_USER \
    --repo $GITHUB_REPO \
    --tag "$TAG" \
    --name $TAG \
    --description "${DESCRIPTION:-$TAG}" \
    > /dev/null 2>&1

github-release -q upload \
    --user $GITHUB_USER \
    --repo $GITHUB_REPO \
    --tag "$TAG" \
    --name "$NAME" \
    --file "$FILE" \
    --replace \
    > /dev/null 2>&1

echo "after_github_release:"
github-release info \
    --user $GITHUB_USER \
    --repo $GITHUB_REPO \
    --tag "$TAG"
