#!/bin/bash
# Bridge robustness (Linux, no Grbl needed): a simulator that keeps exiting or
# cannot start makes the bridge stop and remove its port link.
# Usage: bash test-bridge.sh   (uses a temporary link and log, not ~/ttyGRBL-sim)
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
fail() { echo "FAIL: $1"; cat "$TMP/port.log" 2>/dev/null; exit 1; }

run() {
  GRBL_SIM="$1" GRBL_SIM_PORT="$TMP/tty" GRBL_SIM_LOG="$TMP/port.log" timeout 20 python3 "$HERE/grbl-sim-port.py"
  echo $?
}

# A simulator that exits at once: restarted, then abandoned within about 6 s.
start=$(date +%s)
code=$(run /bin/false)
[ "$code" != "124" ] || fail "the bridge kept restarting /bin/false"
[ $(( $(date +%s) - start )) -le 12 ] || fail "gave up too late"
grep -q "abandon" "$TMP/port.log" || fail "no give-up message"
[ ! -e "$TMP/tty" ] && [ ! -L "$TMP/tty" ] || fail "link left after giving up"

# A simulator that cannot be started at all: the link is still removed.
rm -f "$TMP/port.log"
code=$(run "$TMP/missing-grbl_sim.exe" 2>/dev/null)
[ "$code" != "0" ] || fail "a missing simulator should fail"
[ ! -e "$TMP/tty" ] && [ ! -L "$TMP/tty" ] || fail "link left after a failed start"

echo "PASS bridge: gives up on a crashing simulator, removes the link when the simulator cannot start"
