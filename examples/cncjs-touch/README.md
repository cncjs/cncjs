# CNCjs Touch — experimental touchscreen interface

I ([@storm8488](https://github.com/storm8488)) have been working on this touchscreen interface for CNCjs, with a layout inspired by KlipperScreen. I am sharing the prototype so that someone who already owns a working CNC can help review, test and finish it. **I currently do not have an operational CNC available for physical validation. This is unfinished work, not a production-ready machine interface.**

The project was developed with AI coding assistance. This contribution preserves the existing prototype and its offline regression tests. The maintainer documentation is in English. The interface, operator guidance and journal exports support French, English and Spanish. Native-speaker review and integration with CNCjs conventions remain open work.

## Try it without a machine

Use Node.js 18 or newer. These commands require no npm packages and do not connect to a CNC controller:

```sh
cd examples/cncjs-touch
node verify-project.cjs
node preview-server.cjs
```

Open the localhost URL printed by the preview server. It serves a local visual fixture with synthetic files, a virtual controller and simulated progress. Stop it with Ctrl+C. The mock controller rejects physical commands. The fixture is for local evaluation only; do not deploy its fake authentication or mock responses to a real CNCjs server.

## Latest handoff (2026-10-16)

This update includes FR/EN/ES settings and exports; coordinate preparation, read-only machine limits and a compatible preview position marker inspired by Shopfloor Tablet; guarded local storage; bounded download cleanup; active-job screen-blanking inhibition; stricter state protocol validation; conservative time estimates; and fresh monitoring after network loss or page restoration. See [touch/THIRD-PARTY-NOTICES.md](touch/THIRD-PARTY-NOTICES.md).

**54/54 offline source-package checks pass. Physical CNC validation remains outstanding.** Development is paused at the author’s request pending further review and testing by someone with an operational CNC.

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
| `job-service.js`, `touch-stream.js` | Experimental CNCjs job service and HTTP routes |
| `motion-preflight.js`, `probe-input.js` | Read-only movement checks and probe input observation |
| `install-custom.cjs` | Optional, version-sensitive patcher for an installed CNCjs build |
| `test-*.cjs`, `dom-fixture.cjs`, `verify-project.cjs` | Offline regression suite |
| `preview-server.cjs` | Local mock demo |

## Integration status

These files are isolated under `examples/cncjs-touch`; they do not change CNCjs core source, dependencies, build scripts or startup behavior. This location is proposed for review and handoff, not as an agreed upstream architecture. A standalone pendant repository may be a better home if maintainers prefer it.

The prototype was developed against an installed CNCjs 1.11.5 build. The optional patcher depends on that build's generated `server/app.js` route structure, and the service accesses internal store/config/controller objects. **Compatibility with current master and other controllers has not been established.** The backend currently filters for Grbl. Marlin, Smoothieware and TinyG support must not be inferred from CNCjs itself.

For developers reviewing the integration, `install-custom.cjs` accepts an absolute path to a compiled CNCjs `server/app.js`. It checks expected authentication/route markers, writes a backup and inserts a bootstrap that reads an absolute `CNC_TOUCH_MODULE` path pointing to `job-service.js`. It does not install packages, serve the touch assets, configure the watch directory, or restart CNCjs. Those deployment steps are deliberately not automated here. Keep the four backend modules together and preserve CNCjs authentication when adapting the service. Test only against an isolated installation first, with physical controllers disconnected.

Static assets must be served with the correct CNCjs route prefix and session integration; the shared library also needs a configured watch directory. The local demo does not validate these deployment details. Credentials, machine configuration, user G-code, local deployment scripts and operational logs are excluded from this contribution.

See [TESTING.md](TESTING.md) for the validation scope and [HANDOFF.md](HANDOFF.md) for the remaining work.
