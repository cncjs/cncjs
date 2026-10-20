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

# A hang-up (SSH session closed) removes the link, and a bridge never removes a link that
# another bridge created after it (a stand-in simulator that stays up).
printf '#!/bin/sh\nexec sleep 60\n' > "$TMP/sim.sh"; chmod +x "$TMP/sim.sh"
rm -f "$TMP/port.log"
GRBL_SIM="$TMP/sim.sh" GRBL_SIM_PORT="$TMP/tty" GRBL_SIM_LOG="$TMP/port.log" python3 "$HERE/grbl-sim-port.py" & first=$!
for i in $(seq 1 20); do [ -L "$TMP/tty" ] && break; sleep 0.2; done
[ -L "$TMP/tty" ] || fail "no link"
kill -HUP $first; wait $first
[ ! -e "$TMP/tty" ] && [ ! -L "$TMP/tty" ] || fail "link left after SIGHUP"
GRBL_SIM="$TMP/sim.sh" GRBL_SIM_PORT="$TMP/tty" GRBL_SIM_LOG="$TMP/port.log" python3 "$HERE/grbl-sim-port.py" & a=$!
for i in $(seq 1 20); do [ -L "$TMP/tty" ] && break; sleep 0.2; done
GRBL_SIM="$TMP/sim.sh" GRBL_SIM_PORT="$TMP/tty" GRBL_SIM_LOG="$TMP/port.log" python3 "$HERE/grbl-sim-port.py" & b=$!
sleep 1; second=$(readlink "$TMP/tty")
kill $a; wait $a
[ "$(readlink "$TMP/tty")" = "$second" ] || fail "the first bridge removed the second one's link"
kill $b; wait $b

echo "PASS bridge: gives up on a crashing simulator, removes the link when the simulator cannot start, on SIGHUP, and only its own link"
