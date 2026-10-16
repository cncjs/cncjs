#!/bin/bash
# Builds the Grbl 1.1h simulator with the patches in this folder (Linux, gcc).
# Run from this folder; the sources are cloned next to this script.
set -euo pipefail
cd "$(dirname "$0")"
[ -d grbl ] || git clone -q --depth 1 --branch v1.1h.20190825 https://github.com/gnea/grbl.git grbl
[ -d grbl/grbl/grbl-sim ] || { git clone -q https://github.com/grbl/grbl-sim.git grbl/grbl/grbl-sim && git -C grbl/grbl/grbl-sim checkout -q 9bdd1654c7eb6cacf03e35340b38c962bcebe013; }
git -C grbl apply --check --ignore-whitespace ../grbl.patch 2>/dev/null && git -C grbl apply --ignore-whitespace ../grbl.patch
git -C grbl/grbl/grbl-sim apply --check --ignore-whitespace ../../../grbl-sim.patch 2>/dev/null && git -C grbl/grbl/grbl-sim apply --ignore-whitespace ../../../grbl-sim.patch
# -fcommon: grbl-sim relies on tentative definitions that GCC 10+ rejects by default.
# util/floatunsisf.o is left out: libgcc already provides __floatunsisf on ARM.
make -C grbl/grbl/grbl-sim new FLAGS="-g -O2 -fcommon" \
  SIM_OBJECTS="main.o simulator.o serial.o util/delay.o platform_LINUX.o system_declares.o"
echo "Simulator: $(pwd)/grbl/grbl/grbl-sim/grbl_sim.exe"
