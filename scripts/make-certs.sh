#!/usr/bin/env bash
#
# A certificate for the machine this runs on, and the authority that signs it.
#
#   bash scripts/make-certs.sh                    # this machine, worked out
#   bash scripts/make-certs.sh cnc.lan 10.0.0.5   # or names you pick
#
# Why this exists: a phone will not install a web application, and will not
# run a service worker for it, unless the origin is secure. `http://cnc.lan`
# is not -- measured by asking Chrome itself, which answers
# `not-from-secure-origin`. No amount of manifest fixes that; it needs TLS.
#
# Two files come out of it that matter:
#
#   certs/cnc-ca.crt   install this on the phone, once
#   certs/cnc.crt      what the server presents, with certs/cnc.key
#
# A private authority rather than a self-signed leaf: a self-signed
# certificate can be click-through accepted in a browser, but the exception
# does not make the origin secure, so the service worker still refuses to
# register. Trusting a CA does.
#
# Everything lands in `certs/`, which is ignored by git. These are keys.

set -euo pipefail

# Git Bash rewrites anything that looks like a unix path into a Windows one
# before the program sees it, so `-subj /CN=cncjs` arrived as
# `C:/Program Files/Git/CN=cncjs` and openssl rejected it -- with the error on
# stderr, which the first version of this script was throwing away. Harmless
# everywhere else.
export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL='*'

if ! command -v openssl >/dev/null 2>&1; then
  echo "openssl is not on PATH, and everything here is openssl." >&2
  echo "  Debian/Ubuntu:  sudo apt install openssl" >&2
  echo "  macOS:          it ships with one, or  brew install openssl" >&2
  echo "  Windows:        run this from Git Bash, which brings its own" >&2
  exit 1
fi

cd "$(dirname "$0")/.."
mkdir -p certs
cd certs

# Short, on purpose, while this is still being worked out.
#
# A ten-year certificate was the first instinct -- a machine in a garage, and
# an expiry is a pendant that stops working on a morning nobody remembers why.
# It is also ten years of a private key sitting in a working directory being
# trusted by a phone.
#
# The authority keeps its own longer life: reissuing the leaf costs a server
# restart, reissuing the authority costs a trip to every phone's settings.
#
#   DAYS=365 CA_DAYS=1095 bash scripts/make-certs.sh    to override
DAYS=${DAYS:-30}
CA_DAYS=${CA_DAYS:-365}

NAMES=("$@")

# Nothing given: work out what this machine answers to.
#
# The point of the whole script is that somebody who installs cncjs on their
# own box runs one command and gets a certificate for *their* box. Asking them
# to know their own LAN address first defeats it -- and the first version did
# exactly that, because the names were worked out up in serve-panel.sh where
# anybody running this directly never saw them.
#
# A browser reads only the SAN list, so every address the panel might be
# reached at has to be in it: the short name, the `.lan` name a home router
# hands out, the fully-qualified name if the system knows one, and the bare
# addresses for when none of the names resolve.
if [ ${#NAMES[@]} -eq 0 ]; then
  HOST=$(hostname 2>/dev/null | tr -d '\r\n' || true)
  SHORT=${HOST%%.*}

  if [ -z "$SHORT" ]; then
    echo "This machine will not say what it is called, so the names have to be given:" >&2
    echo "  bash scripts/make-certs.sh <hostname> [more names or addresses...]" >&2
    exit 2
  fi

  NAMES=("$SHORT")

  # `hostname -f` is a Linux and macOS spelling; Git Bash's hostname has no
  # such flag and simply fails, which is why this is allowed to.
  FULL=$(hostname -f 2>/dev/null | tr -d '\r\n' || true)
  case "$FULL" in
    "$SHORT") ;;
    *.*) NAMES+=("$FULL") ;;
  esac

  case " ${NAMES[*]} " in
    *" $SHORT.lan "*) ;;
    *) NAMES+=("$SHORT.lan") ;;
  esac

  # Every address on every interface that is not loopback. Node rather than
  # ip/ifconfig/ipconfig, because this is a Node project and those three
  # disagree about everything including which platforms they exist on.
  ADDRS=$(node -e "const os=require('os');const s=new Set();for(const l of Object.values(os.networkInterfaces()))for(const i of l||[])if(i.family==='IPv4'&&!i.internal)s.add(i.address);process.stdout.write([...s].join(' '))" 2>/dev/null || true)

  if [ -z "$ADDRS" ]; then
    echo "Could not work out this machine's addresses, so this covers names only."
    echo "If the phone reaches the server by address, pass it:"
    echo "  bash scripts/make-certs.sh $SHORT.lan <address>"
    echo
  fi

  for addr in $ADDRS; do
    NAMES+=("$addr")
  done
fi

# What the authority is allowed to vouch for.
#
# This is the one decision that says how bad it is to have installed it. An
# unconstrained private CA on a phone is a key that can mint `google.com` for
# that phone -- trusting it for the panel would mean trusting it for the
# owner's bank. Constrained, the worst a stolen `cnc-ca.key` buys is the right
# to impersonate a CNC machine on a home network.
#
# Absent constraints everything is permitted; present, everything *not* listed
# for that type is refused. So `localhost` and the loopback have to be spelled
# out alongside the rest -- they are in the leaf's own SAN list. The private
# ranges are all three rather than this machine's current subnet, so a router
# handing out a different block is not a morning spent on certificates; none
# of them is reachable from outside the house anyway.
CONSTRAINTS="critical,permitted;DNS:.lan,permitted;DNS:localhost"
CONSTRAINTS="${CONSTRAINTS},permitted;IP:127.0.0.1/255.255.255.255"
CONSTRAINTS="${CONSTRAINTS},permitted;IP:192.168.0.0/255.255.0.0"
CONSTRAINTS="${CONSTRAINTS},permitted;IP:10.0.0.0/255.0.0.0"
CONSTRAINTS="${CONSTRAINTS},permitted;IP:172.16.0.0/255.240.0.0"

# Plus whatever this machine is actually called.
#
# `.lan` does not cover a bare hostname -- `mateo-desktop` has no dot in it and
# so sits in no subtree at all. The first version left it out and the authority
# refused its own leaf, which is the failure the check further down exists to
# catch. A name under some other domain (`box.fritz.box`) lands here too.
for name in "${NAMES[@]}"; do
  case "$name" in
    *[0-9].[0-9]*.[0-9]*.[0-9]*) ;;
    *.lan) ;;
    localhost) ;;
    *) CONSTRAINTS="${CONSTRAINTS},permitted;DNS:${name}" ;;
  esac
done

# An authority made before the constraints existed is exactly the thing they
# were added to prevent, so it is replaced rather than kept.
#
# Read out of the text dump rather than asked for by name: `openssl x509 -ext
# nameConstraints` prints "No extensions in certificate" and still exits 0, so
# the obvious spelling of this check silently never fired. Measured.
if [ -f cnc-ca.crt ] \
  && ! openssl x509 -in cnc-ca.crt -noout -text 2>/dev/null | grep -q 'X509v3 Name Constraints'; then
  echo "- the existing authority can vouch for any name at all. Replacing it."
  echo "  Install the new certs/cnc-ca.crt on every phone that has the old one,"
  echo "  and delete the old one there."
  rm -f cnc-ca.key cnc-ca.crt cnc-ca.srl
fi

if [ ! -f cnc-ca.key ]; then
  echo "- making the authority"
  # Held rather than shown, and shown only if it failed.
  #
  # Generating a key prints a screenful of dots to stderr, which on a first
  # run reads exactly like something going wrong. Throwing stderr away instead
  # is what hid the `-subj` failure for an hour the first time this was
  # written, so it is kept and printed on the one path that wants it.
  if ! noise=$(openssl req -x509 -newkey rsa:2048 -sha256 -days "$CA_DAYS" -nodes \
    -keyout cnc-ca.key -out cnc-ca.crt \
    -subj "/CN=cncjs local authority" \
    -addext "basicConstraints=critical,CA:TRUE" \
    -addext "keyUsage=critical,keyCertSign,cRLSign" \
    -addext "nameConstraints=${CONSTRAINTS}" 2>&1); then
    echo "$noise" >&2
    exit 1
  fi
else
  echo "- authority already exists, keeping it"
fi

ALT=""
for name in "${NAMES[@]}"; do
  if [[ "$name" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    ALT="${ALT}IP:${name},"
  else
    ALT="${ALT}DNS:${name},"
  fi
done
ALT="${ALT}DNS:localhost,IP:127.0.0.1"

echo "- making the certificate for ${ALT}"
if ! noise=$(openssl req -newkey rsa:2048 -sha256 -nodes \
  -keyout cnc.key -out cnc.csr \
  -subj "/CN=${NAMES[0]}" 2>&1); then
  echo "$noise" >&2
  exit 1
fi

# A real file rather than `<(...)`. Process substitution hands openssl a path
# like `/dev/fd/63`, and the Windows build cannot open one -- it fails with
# `No such process`, which is not a sentence anybody would connect to a shell
# feature.
{
  echo "subjectAltName=${ALT}"
  echo "basicConstraints=CA:FALSE"
  echo "keyUsage=digitalSignature,keyEncipherment"
  echo "extendedKeyUsage=serverAuth"
} > cnc.ext

if ! noise=$(openssl x509 -req -in cnc.csr -days "$DAYS" -sha256 \
  -CA cnc-ca.crt -CAkey cnc-ca.key -CAcreateserial \
  -out cnc.crt \
  -extfile cnc.ext 2>&1); then
  echo "$noise" >&2
  exit 1
fi

rm -f cnc.csr cnc.ext

# The two private keys are the whole security of this arrangement, and openssl
# writes them with whatever umask it found. A no-op on Windows, whose
# filesystem has no such bit; everywhere else it is the difference between a
# key only this account can read and one every account on the box can.
chmod 600 cnc-ca.key cnc.key 2>/dev/null || true

# Asked, not assumed.
#
# The constraints mean the authority can now refuse its own certificate, and it
# did: a name outside every permitted subtree fails with `permitted subtree
# violation` -- at the browser, on the phone, in the garage. Here it fails at
# the second it is made instead.
if ! openssl verify -CAfile cnc-ca.crt cnc.crt >/dev/null 2>&1; then
  echo >&2
  echo "The authority refuses this certificate:" >&2
  openssl verify -CAfile cnc-ca.crt cnc.crt >&2 || true
  echo >&2
  echo "A name here is outside what the authority is allowed to vouch for --" >&2
  echo "it was made for an earlier set of names. Replace it with" >&2
  echo "  rm certs/cnc-ca.* && bash scripts/make-certs.sh $*" >&2
  echo "and install the new certs/cnc-ca.crt on every phone." >&2
  exit 1
fi

echo
openssl x509 -in cnc.crt -noout -subject -ext subjectAltName -enddate
echo
echo "The authority -- this is the file that goes on the phone:"
openssl x509 -in cnc-ca.crt -noout -enddate -fingerprint -sha256
echo
echo "  certs/cnc-ca.crt   install on the phone as a CA certificate"
echo "  certs/cnc.key      never leaves this machine"
echo
echo "Serve it with:  yarn serve"
