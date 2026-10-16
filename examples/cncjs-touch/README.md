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

## Job progress, overrides and macros (2026-10-16)

Three additions for the running-job screen, written without a controller at hand and therefore only exercised against the simulation and the offline mocks:

- **Toolpath progress on the preview.** The preview worker now samples the tool position about a thousand times along the file (`trail`, with the count of non-empty lines sent so far) and stores it in the preview sidecar. During a job the dashboard draws the part of the path covered by the acknowledged lines (`received / total`) as an orange polyline over the stored image. It is indicative: Grbl acknowledges lines before executing them, and the sampling is coarse.
- **Feed and spindle overrides.** Buttons for −10 / −1 / 100 % / +1 / +10 appear under the job actions while a job is running or paused on a fresh controller; they map one-to-one onto the Grbl realtime commands (`feedOverride` / `spindleOverride`). The server validates kind and value and refuses them outside a job.
- **CNCjs macros from the tablet.** A "Macros…" entry in the preparation sheet lists the macros defined in CNCjs (names only; the server never sends their content). Running one takes the same confirmation dialog as a start (ticket, fifteen seconds, machine idle and fresh) and ends in `macro:run`, so a macro cannot be launched by one stray touch.

Nothing above was run with a real controller. Overrides and macros stay disabled whenever the controller state is stale, and the simulation page carries two fictional macros to try the flow.

## System tab in the settings (2026-10-16)

Réglages now has two tabs, "Affichage" (the existing display settings) and "Système", a read-only panel in the spirit of KlipperScreen's system screen: usage of each CPU core as a bar, total CPU, temperature sensors, memory (based on `MemAvailable`), load average, battery and mains state, and the memory and uptime of the CNCjs process. The figures describe the computer that runs CNCjs, which is the tablet itself in the kiosk setup. They come from `GET /api/touch-system` (`src/server/services/touch/system-stats.js`: `os.cpus()` deltas and a few small sysfs files, one shared sample per 500 ms). The page polls every 2 s and only while that tab is on screen. Failed requests back off up to 30 s. Nothing is sent to the controller.

## Network, history, tablet actions and clock (2026-10-16)

- **Système** also shows the network link (IPv4 addresses, and for Wi-Fi the SSID, signal in dBm and bitrate, read with `iw dev <name> link` at most every 10 s in the background), and a ten-minute history of CPU usage and temperature. The server samples it every 5 s, even with the tab closed, on an `unref`'d timer.
- **Tablette** (in Système) shows the installed interface version from `touch/VERSION.json` (written by the deployment script: commit, branch, repository, date). When that file names a GitHub repository, the page compares it with the latest commit of the branch through the public GitHub API, at most every ten minutes. Below it are the host commands configured in CNCjs (Settings → Commands, `commands` in `.cncrc`), for example update the interface, restart CNCjs, reboot or shut down. The page shows their titles only. Each needs a second tap within 8 s, and all are refused while a job is running or paused. What a command does is up to whoever configures CNCjs; this interface adds no server route for it and runs nothing else.
- **Affichage → Horloge** shows the time in the header. It updates once a minute on the minute, and not at all while the page is hidden or the clock is switched off.

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
- A prototype Grbl job service with explicit controller selection, freshness checks and expiring start/resume/macro confirmations, plus feed and spindle overrides during a job.
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
