#!/usr/bin/env bash
#
# Start the server the way a phone can actually use it.
#
#   bash scripts/serve-panel.sh
#   bash scripts/serve-panel.sh --port 8000
#
# Three things have to be true before a pendant will install on a phone, and
# every one of them was found the hard way:
#
#   1. The origin is secure. Chrome answers `not-from-secure-origin` for
#      `http://` on a LAN address and will neither install the application nor
#      register its service worker. Measured, not assumed.
#   2. The phone can reach the port at all. Node's own firewall rules on this
#      machine are for the *Public* profile, and a home network is *Private*.
#   3. The phone trusts whoever signed the certificate.
#
# This handles the first two. The third is a file you carry across once --
# `certs/cnc-ca.crt`, installed on the phone as a CA.
#
# Plain HTTP is still one flag away (`--no-tls`) for the times TLS is in the
# way rather than the point: the end-to-end suite talks to `http://localhost`
# and has no reason to know about a private authority.

set -euo pipefail
cd "$(dirname "$0")/.."

PORT=8000
TLS=1
EXTRA=()

while [ $# -gt 0 ]; do
  case "$1" in
    --port) PORT="$2"; shift 2 ;;
    --no-tls) TLS=0; shift ;;
    *) EXTRA+=("$1"); shift ;;
  esac
done

# The widget boilerplate the dev server has always mounted.
MOUNT='/widget:https://cncjs.github.io/cncjs-widget-boilerplate/v1/'

# Reissued when it is gone *or* about to run out.
#
# Checking only for the file's existence was not enough: an expired
# certificate is still a file, so the server would start on it and the pendant
# would come up saying "no server" with no clue why. The leaf is short-lived
# on purpose, so this is the ordinary path rather than an edge case.
#
# Three days of margin, so a certificate never runs out mid-session.
NEED_CERT=0
if [ "$TLS" = "1" ]; then
  if [ ! -f certs/cnc.crt ]; then
    NEED_CERT=1
  elif ! openssl x509 -checkend $((3 * 86400)) -noout -in certs/cnc.crt >/dev/null 2>&1; then
    echo "Certificate has run out or is about to. Reissuing:"
    echo
    rm -f certs/cnc.crt certs/cnc.key
    NEED_CERT=1
  elif [ -f certs/cnc-ca.crt ]     && ! openssl x509 -in certs/cnc-ca.crt -noout -text 2>/dev/null        | grep -q 'X509v3 Name Constraints'; then
    # An authority with nothing limiting it can vouch for any site a phone
    # visits, not only this one. make-certs replaces it and says so; this is
    # only what gets it called, since the leaf itself may be perfectly fresh.
    rm -f certs/cnc.crt certs/cnc.key
    NEED_CERT=1
  fi
fi

if [ "$NEED_CERT" = "1" ]; then
  echo "Making a certificate:"
  echo
  # No names passed: make-certs works out what this machine answers to, so
  # that somebody who installs cncjs on their own box runs one command and
  # gets a certificate for their box. The names were computed here before,
  # which meant anybody calling make-certs directly got a usage error.
  bash scripts/make-certs.sh
  echo
fi

# Opened for as long as something is listening on the port, and closed after.
#
# The watcher follows the *port*, not this shell: `$$` here is an MSYS id from
# a namespace Windows does not share, so a watcher given it matched nothing,
# returned at once, and removed the rule a second after adding it. Measured.
#
# Kill the server however you like; the rule still comes off, because the
# watcher is a separate elevated process that outlives it.
if command -v powershell >/dev/null 2>&1; then
  powershell -NoProfile -ExecutionPolicy Bypass     -File scripts/allow-lan.ps1 -Port "$PORT" -Watch || true
fi

# The authority is the one that costs a trip to the phone, so it is worth
# hearing about early rather than on the morning it stops working. Every
# certificate it ever signed becomes untrusted the moment it expires.
if [ "$TLS" = "1" ] && [ -f certs/cnc-ca.crt ]; then
  if ! openssl x509 -checkend $((30 * 86400)) -noout -in certs/cnc-ca.crt >/dev/null 2>&1; then
    echo
    echo "  WARNING: the authority expires within 30 days."
    echo "  Reissuing it means installing the new one on every phone again:"
    echo "    rm certs/cnc-ca.* && bash scripts/serve-panel.sh"
    echo
  fi
fi

if [ "$TLS" = "1" ]; then
  LAN=$(node -e "const os=require('os');const v=Object.values(os.networkInterfaces()).flat().find(i=>i.family==='IPv4'&&!i.internal);process.stdout.write(v?v.address:'localhost')")
  echo
  echo "  panel:  https://${LAN}:${PORT}/panel/"
  echo "  trust:  https://${LAN}:${PORT}/panel/cnc-ca.crt  (open on the phone, install as a CA)"
  echo
  exec env NODE_ENV=development ./bin/cncjs \
    --port "$PORT" \
    --tls-key certs/cnc.key \
    --tls-cert certs/cnc.crt \
    --tls-ca certs/cnc-ca.crt \
    -m "$MOUNT" \
    ${EXTRA[@]+"${EXTRA[@]}"}
fi

echo
echo "  panel:  http://localhost:${PORT}/panel/   (no TLS: no install, no worker)"
echo
exec env NODE_ENV=development ./bin/cncjs \
  --port "$PORT" \
  -m "$MOUNT" \
  ${EXTRA[@]+"${EXTRA[@]}"}
