# CNCjs Touch — experimental touchscreen interface

I ([@storm8488](https://github.com/storm8488)) have been working on this touchscreen interface for CNCjs, with a layout inspired by KlipperScreen. I am sharing the prototype so that someone who already owns a working CNC can help review, test and finish it. **I currently do not have an operational CNC available for physical validation. This is unfinished work, not a production-ready machine interface.**

The project was developed with AI coding assistance. This contribution preserves the existing prototype and its offline regression tests. The maintainer documentation is in English. The interface, operator guidance and journal exports support French, English and Spanish. Native-speaker review and integration with CNCjs conventions remain open work.

## Try it without a machine

Use Node.js 22.12 or newer: the demo loads the job service from `src/server` as a native ES module (the offline suite itself still runs on Node.js 18). These commands require no npm packages and do not connect to a CNC controller:

```sh
cd examples/cncjs-touch
node verify-project.cjs
node preview-server.cjs
```

Open the localhost URL printed by the preview server. It serves a local visual fixture with synthetic files, a virtual controller and simulated progress. Stop it with Ctrl+C. The mock controller rejects physical commands. The fixture is for local evaluation only; do not deploy its fake authentication or mock responses to a real CNCjs server.

## Server integration (2026-10-16)

The backend now lives in the CNCjs source tree instead of being patched into a compiled build: `src/server/services/touch/` holds the job service, NDJSON event stream, motion preflight and probe-input observer; `src/server/api/api.touch.js` adds the session check and HTTP status mapping; `src/server/app.js` registers the routes next to the other API routes and `src/server/index.js` starts the service with the other services. The former `install-custom.cjs` patcher and the `CNC_TOUCH_MODULE` bootstrap are gone. The backend tests were ported to Jest (`yarn test`); the offline suite in this directory now covers the browser side only (50/50 checks).

Route names (`api/custom/health`, `api/touch-job`, `api/touch-motion/preview`, `api/touch-events`), the French server-side messages (CNCjs uses i18next elsewhere) and the error payload shape (`{message}` rather than the `{msg}` of the existing API) were kept as the browser code expects them; all three still need maintainer agreement.

## Preview performance pass (2026-10-16)

The G-code preview parser is 2.8–3.7× faster and the preview worker overlaps parsing with drawing; the full 20 MB pipeline runs in 55 % of its previous time on the development PC. Behaviour is unchanged (differentially fuzzed against the previous parser). See [TESTING.md](TESTING.md), "Preview pipeline measurements", for the numbers, the rejected approaches and the caveats. Measurements on the real touchscreen remain to be made: open a page with `?perf=1` and export the report (see TESTING.md, "Measuring on the device").

## Previous handoff (2026-10-16)

This update includes FR/EN/ES settings and exports; coordinate preparation, read-only machine limits and a compatible preview position marker inspired by Shopfloor Tablet; guarded local storage; bounded download cleanup; active-job screen-blanking inhibition; stricter state protocol validation; conservative time estimates; and fresh monitoring after network loss or page restoration. See [touch/THIRD-PARTY-NOTICES.md](touch/THIRD-PARTY-NOTICES.md).

**All offline checks pass (50/50 browser-side checks here, backend covered by the root Jest suite). Physical CNC validation remains outstanding.** Development is paused at the author’s request pending further review and testing by someone with an operational CNC.

## What is included

- Touch-oriented menu, job dashboard, shared file library, combined movement/origin screen, machine information, journal and settings.
- XY G-code previews supporting linear moves and supported G2/G3 arcs, stored image previews, percentage progress and remaining-time display. The preview is indicative; it does not simulate machining, collisions, Z motion or laser power.
- A separate simulation mode for job controls, movement, work origins and alarms. Its progress and estimated time are fictional.
- Probe profiles, geometry/direction/search parameters, import/export and preparation diagrams. Physical probing is not implemented or validated.
- Configurable screen dimming/blanking overlay and display settings. This is a browser feature, not hardware power management.
- A prototype Grbl job service with explicit controller selection, freshness checks and expiring start/resume confirmations.
- An authenticated, bounded NDJSON state stream, slower polling fallback, hidden-view rendering suppression and worker-based preview processing to reduce work on limited hardware.

The original display target was a Surface RT-class device: 1366 × 768, Tegra 3 and 2 GB RAM. The current implementation still needs browser/device compatibility testing; it is not a promise of support for the original Windows RT browser.

## Important distinction: simulation versus real integration

The local demo above has no physical machine connection. However, **the real backend contains CNCjs load/start/pause/resume/stop commands**. Connecting it to a real installation is a separate integration task. Real movement/origin/probing workflows remain blocked or limited to preparation; do not remove those restrictions just to make buttons active.

An interface stop button is not a physical emergency stop. Offline checks and confirmation dialogs do not establish machine safety. Supervised hardware testing is still required before relying on this interface.

## Code map

| Files | Purpose |
| --- | --- |
| `touch/index.html`, `touch/simulation.html` | Real-interface entry point and simulation entry point |
| `touch/touch-shell.*`, `touch/viewport-fit.*` | Navigation and display layout |
| `touch/job-controls.js`, `touch/job-dashboard.js`, `touch/job-stream.js` | Job interaction, dashboard and state transport |
| `touch/shared-library.js`, `touch/library-preview*.js`, `touch/library-payload.js` | File library, worker preview and upload payload preparation |
| `touch/probe-*.js`, `touch/dry-motion.js` | Probe preparation and movement preflight UI |
| `touch/perf-harness.js` | Opt-in (`?perf=1`) on-device measurement badge and JSON report |
| `test-*.cjs`, `dom-fixture.cjs`, `verify-project.cjs` | Offline browser-side regression suite |
| `preview-server.cjs` | Local mock demo |
| `../../src/server/services/touch/`, `../../src/server/api/api.touch.js` | Job service, event stream, motion preflight, probe input and their HTTP routes (Jest tests alongside) |

## Integration status

The browser assets stay under `examples/cncjs-touch`; the backend is part of `src/server` (see above) and is registered behind the same express-jwt protection as the rest of the API, with an explicit `req.user` check so the development-mode bypass never reaches a machine command. This layout is proposed for review, not as an agreed upstream architecture. A standalone pendant repository may still be a better home if maintainers prefer it.

The service reads internal store/config/controller objects (`runner`, `sender`, `workflow`, `feeder`, `settings`) and was written against CNCjs 1.11.5 behaviour; those internal APIs should be reviewed against current master. **Compatibility with other controllers has not been established.** The backend filters for Grbl. Marlin, Smoothieware and TinyG support must not be inferred from CNCjs itself.

The touch pages are served by CNCjs itself since 2026-10-16: `settings.assets.touch` in `src/server/config/settings.base.js` mounts this `touch/` directory at `<route>/touch/` (so `http://<host>:<port>/touch/index.html` and `/touch/simulation.html`), resolved from the compiled server tree (`output/cncjs/server` or `dist/cncjs/server`); when that directory is absent, as in a packaged install without `examples/`, the asset is skipped with a warning. Static assets are now registered before the session middleware in `src/server/app.js`, because loading and rewriting the session file for each of the ~60 page scripts made `session-file-store` fail with `EPERM` on rename under Windows and truncated the responses; the main app's assets benefit from the same ordering. No touch HTML or JavaScript was changed: the pages already derive their API base from the path before `/touch/`, load `/socket.io/socket.io.js` from the same origin and read the JWT the main CNCjs app stores in `localStorage` (`cnc` → `state.session.token`), so the operator must sign in to CNCjs at the server root once before opening the touch page. The shared library still needs a configured watch directory (`-w` or `watchDirectory`). The heartbeat timer of the event stream is `unref()`ed so a started service never keeps the process alive on its own; CNCjs installs no SIGINT handler, so Ctrl+C ends the process immediately, with open streams included. Test only against an isolated installation first, with physical controllers disconnected. Credentials, machine configuration, user G-code, local deployment scripts and operational logs are excluded from this contribution.

See [TESTING.md](TESTING.md) for the validation scope and [HANDOFF.md](HANDOFF.md) for the remaining work.
