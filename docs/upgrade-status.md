# Upgrade status

Working notes for the dependency and deployment work in this fork. Git history
records what changed and why; this file records the shape of the effort — what
is done, what was deliberately left, and what is waiting on someone.

Last updated after socket.io moved to v4 (PR #5).

## Where this is going

The machine and its Arduino/Grbl controller move to the garage, attached to a
**mini PC running only the cncjs server**. No Electron there — it is a server.
A **laptop runs the Electron app in client mode** and connects to it, alongside
the browser rather than replacing it.

The mini PC is a Cayin media player being converted to a normal Linux. That
makes deployment ordinary: a systemd unit, the service user in `dialout`, and
Node ≥18. A genuine Arduino Uno enumerates as `/dev/ttyACM0` there, not
`/dev/ttyUSB0`.

## Done

| | |
|---|---|
| Vulnerability patches without crossing a major | `i18next-http-middleware`, `morgan`, `moment`, `lodash`, `minimatch`, plus `resolutions` for transitive copies |
| Electron 22.0.3 → 44.4.2 | with `electron-builder` 23 → 26 and `@electron/rebuild` 3 → 4 |
| Renderer isolation | `contextIsolation: true`, `sandbox: true`, a preload bridge exposing two calls |
| Client mode | a configured server URL makes the app a client instead of starting its own server |
| Windows installer | NSIS, with the native `serialport` binding rebuilt for the new ABI |
| socket.io 2 → 4 | PR #5, open at the time of writing |
| Four test tiers | 547 tests: 517 jest, 15 smoke, 6 hardware, 9 Electron |

Audit went from 2 critical / 26 high to 0 critical / 11 high. Most of that came
from the Electron toolchain upgrade pulling a layer of old transitive packages
out of the tree, not from the patch work.

## Waiting on a person

- **Install the NSIS package on the laptop and confirm it runs.** The build is
  verified here — it launches, mounts, and lists serial ports from the rebuilt
  native binding — but "builds and runs on the build machine" is not the same
  claim as "installs and runs on yours".
- **Put Linux on the Cayin.** Everything garage-side waits on that.

## Deliberately deferred

Judgement calls, not oversights. Each has a reason.

**Garage-side security.** Ranked low priority. What it defers:

- `connect-multiparty` carries an arbitrary-file-upload advisory with **no
  published fix**. It is the G-code upload path, so it is reachable over
  whatever network the server sits on. It cannot be bumped — replacing it with
  `multer` is the only route. This is the one deferred item that combines "no
  fix exists" with "exposed to the network".
- No user account exists. `validateUser` passes everyone while the `users`
  list is empty, so JWT enforcement in production is decorative until one is
  created.

**CVE-2019-0542 in xterm.** Every version that patches it moved `term.buffer`
behind a public facade, and `Console/Terminal.jsx` is built on the internal
buffer — `buffer.lines.get()`, assignments to `buffer.x`, `updateRange`,
`eraseLine`. No version both fixes the CVE and leaves the widget working, so
the bump was reverted. Fixing it means rewriting the widget's line editing
against the public API. Exploiting it needs malicious firmware or access to the
wire between controller and PC.

**Remaining dependency layers.** Backend majors — `express-jwt` 5 → 8 closes
another high advisory and removes the last vulnerable `jsonwebtoken` copy;
`uuid`, `commander`, `superagent`, `minimatch` follow. Dev tooling —
eslint 8 → 10 needs the flat-config migration. `three` 0.103 → 0.125+ is the
risky one: every 0.x bump in three is breaking and the Visualizer is 6.5k
lines.

## Known defects, unfixed

**A dead serial link reports as healthy.** Seen live: `/api/controllers`
returned `ready: true` and `Idle` for a controller whose serial connection had
died. cncjs kept writing commands, the firmware received nothing, and the UI
showed a connected, idle machine silently ignoring input. There is no liveness
check anywhere. On a real machine that is worse than a visible error — an
operator has no signal that the machine stopped listening. Fixing it is a
feature rather than a patch, which is why it is here and not in the list above.

**The API is unauthenticated in development mode.** `src/server/app.js` bypasses
JWT verification outright when `NODE_ENV=development`. Fine for localhost
development; worth knowing before pointing anything at a dev instance.

**socket.io v2 clients can no longer connect.** The protocol is not compatible
across majors, so `cncjs-pendant-*` and any similar third-party client need
their own upgrade. Nothing here depends on one, but a deployment might.

## Testing

Four tiers, described in `e2e/README.md`. The short version:

```bash
yarn jest                                    # 517, server only
yarn test:e2e --project=smoke                # 15, needs a running server
CNCJS_TEST_PORT=COM3 yarn test:e2e --project=hardware   # 6, moves a real machine
yarn build-prod && yarn test:e2e --project=electron     # 9, packaged app
```

The hardware tier is the one that earns its keep. It caught a broken xterm
upgrade that every other tier was structurally blind to: the smoke tier never
opens a serial port, so nothing behind `serialport:open` is visible to it.
