#!/bin/bash
# Should be used until https://github.com/webpack/watchpack/pull/23 is merged and available in npm
# See https://github.com/webpack/watchpack/issues/2#issuecomment-135204573 for more info

# Ensure we have npm
if ! hash npm 2>/dev/null; then
  echo 'No NPM installed!'
  exit 1
fi

# npm@3 uses flat tree structure so account for that
if npm -v 2>/dev/null | grep -q "^2."; then
  FILEPATH="node_modules/webpack/node_modules/watchpack/lib/DirectoryWatcher.js"
else
  FILEPATH="node_modules/watchpack/lib/DirectoryWatcher.js"
fi

INSERTION_POINT_BEFORE="followSymlinks: false,"
MISSING_OPTION="ignored: /node_modules/,"

if ! cat ${FILEPATH} 2>/dev/null | grep -q "${MISSING_OPTION}"; then
  echo 'Fixing webpack watch (polling) slowness with a manual hack. See https://github.com/webpack/watchpack/pull/23 for more info.'
  sed -i -e 's|'"${INSERTION_POINT_BEFORE}"'|'"${INSERTION_POINT_BEFORE} ${MISSING_OPTION}"'|' "${FILEPATH}"
fi
