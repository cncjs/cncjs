#!/usr/bin/env bash

set -euo pipefail

args=(
  --port 8000
  -m /widget:https://cncjs.github.io/cncjs-widget-boilerplate/v1/
)

if [ -n "${CONFIG_PATH:-}" ]; then
  args+=(--config "$CONFIG_PATH")
fi

exec ./bin/cncjs "${args[@]}"
