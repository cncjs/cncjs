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

## Z zero with a touch plate (2026-10-18)

Suivi can set the work Z with a touch plate, at rest or during a tool change pause: thickness and maximum travel down, then the usual confirmation; fast touch, back-off, slow touch, `G10 L20`, 5 mm clearance, all in absolute coordinates. Refused when the probe is already in contact, the spindle turns, or `$G` is not `G90 G21`; Stop interrupts it. Details and the simulator run in `TESTING.md`; the plan for the machine in `HANDOFF.md`, step 9.

## Resume from a line and tool change (2026-10-18)

Suivi can restart a program from one of its lines: the server replays the program's state up to that line, checks it, and loads a rebuilt program with a safe preamble (clearance height, XY start, spindle and coolant with a spin-up dwell, slow plunge). Pauses asked by the program (`M0`, `M1`, tool change `M6`) can be resumed from the touch screen; after a tool change the spindle is started again before the program resumes. Details in `TESTING.md`.

## UI 2027 (2026-10-17)

The interface was redesigned for an operator standing about a metre from a 1366 × 768 tablet, often with gloves, looking at the machine more than at the screen. Nothing changed in the contract with the server or in the safety rules (confirmation tickets, guards, ≤ 2.5 s freshness, no automatic resume, software stop is not an emergency stop): only the presentation and the organisation of the screens.

- **One design system.** `touch/design-tokens.css` holds every colour (a dark workshop theme by default and a high-contrast light theme under `html[data-theme="light"]`, chosen in Réglages → Thème), the type scale (nothing useful under 16 px), 4 px spacings, radii, tap sizes (64 px primary, 48 px secondary, 12 px gaps, 96 px jog cross) and motion limits (transform/opacity only, 150 ms). `touch/ui-2027.css` builds the components and the screen layouts on those tokens; the older sheets now reference the tokens too. Colours carry meaning only: green safe, amber attention, red stop or alarm, blue information, grey disabled (reduced contrast plus a stripe pattern; a tap on a disabled control shows its reason). The component sheet and the validated mockups are in [design/](design/).
- **A status strip on every screen** (`touch/status-strip.js`): the Grbl state as a word, an icon and a colour, the age of the last report, spindle and feed, the loaded file, and Pause / Arrêter while a job runs (relayed to the existing buttons, so every guard is unchanged). The rail lists all seven screens.
- **Suivi**: preview and overrides (−10 / 100 / +10 % large, ±1 % smaller) on the left; percentage in 64 px, remaining time, work coordinates in 48 px, real feed and spindle, a short readiness notice and the actions on the right. Démarrer or Reprendre is the one primary action; Arrêter stands alone at the bottom.
- **Fichiers**: 92 px rows with a thumbnail and the XY extent from each stored preview (read one at a time in idle time), search, and a single action, "Charger et ouvrir le Suivi". Démarrer, Pause, Reprendre and Arrêter left this screen.
- **Préparer**: 96 px jog cross, segmented step, work coordinates in 48 px; setting a work zero takes two taps (arm, then confirm within three seconds).
- **Menu**: a "Reprendre où j'en étais" bar and six tiles with live indicators (job and progress, loaded file, dry-run moves, alarm or commissioning to do).
- **Machine**: the state as one word, an alarm explained with what to do next, $X and $H as large commands, then the links and the report freshness. **Journal**: a timeline with colour stripes and filters (errors, jobs, alarms). **Réglages**: the KlipperScreen list on the tokens, plus the theme. The confirmation dialog shows a 48 px "I am in front of the machine" box and a visible countdown bar.
- **Every screen fits 1366 × 768 at scale 1**; `viewport-fit.js` only scrolls the long lists (and Réglages), and a remembered scale is re-measured when the content became smaller.

On-device measurements (opening time of each screen, CPU at rest and during a simulated job, before and after) and the simulator run are in TESTING.md, "UI 2027": CPU is unchanged, Préparer and Réglages open faster, Journal (about 90 ms), Menu and Suivi (30–40 ms) open slower. Nothing was run on a real machine.

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

- **Système** also shows the network link (IPv4 addresses, and for Wi-Fi the SSID, signal in dBm and bitrate, read with `iw dev <name> link` at most every 10 s while the tab asks for it), and a ten-minute history of CPU usage and temperature. The server samples that history (CPU and temperature only) every 5 s, even with the tab closed, on an `unref`'d timer.
- **Tablette** (in Système) shows the installed interface version from `touch/VERSION.json` (written by the deployment script: commit, branch, repository, date). When that file names a GitHub repository, the page compares it with the latest commit of the branch through the public GitHub API, at most every ten minutes. Below it are the host commands configured in CNCjs (Settings → Commands, `commands` in `.cncrc`), for example update the interface, restart CNCjs, reboot or shut down. The page shows their titles only. Each needs a second tap within 8 s, and all are refused while a job is running or paused. What a command does is up to whoever configures CNCjs; this interface adds no server route for it and runs nothing else.
- **Affichage → Horloge** shows the time in the header. It updates once a minute on the minute, and not at all while the page is hidden or the clock is switched off.

## Code review before the machine (2026-10-17)

A full review of the touch code fixed 25 defects (spindle and stop guards, the commissioning E-stop and spindle steps, previews that could hide moves, the wrong file selected after an upload, tablet commands during motion, translations, simulator robustness). Details in `TESTING.md`, "Code review before the machine".

## Alarm help and travel check (2026-10-17)

Alarms and Grbl errors are explained in plain words (FR/EN/ES), the start confirmation warns when the program would leave the machine travel ($130/$131 and the homing direction $23, valid after homing), and Suivi says when a job waits for Grbl's replies while Grbl stays idle. Details in `TESTING.md`.

## Second pass (2026-10-17)

Four remaining defects (a screen left hidden while its content changed, a program ending in a Grbl error shown as finished, Latin-1 files losing their accents, durations on the wall clock), two optimisations measured on the tablet (snapshots no longer built for repeated reports, no `iw` process at rest: about −20 % CPU for CNCjs at rest), and a counter-review of the first pass (stop during a macro or with the door open, spindle check without `FS`, stream timeouts, translations). Details in `TESTING.md`, "Second pass".

## Commissioning assistant (2026-10-17)

Réglages → "Mise en service de la machine" (also opened by itself the first time a real controller is connected, and from the Machine screen) walks through nine steps before the first job: checklist, `$$` backup download, emergency stop, limit switches, probe, homing (`$H`), spindle and VFD test at the minimum speed, an air-cut test file, and a summary saved with the date for that controller port. Each step can be skipped, and so can the whole assistant after ticking "Je passe les vérifications sous ma responsabilité"; it resumes where it was left. `$X`, `$H` and the spindle start go through the same confirmation dialog as a job start and are refused during a job; the Machine screen also has `$X` and `$H`. The other checks only read the controller's reports (alarm, `Pn` inputs, spindle speed).

## Grbl simulator (2026-10-16/17)

[grbl-sim/](grbl-sim/README.md) builds the official Grbl 1.1h firmware as a Linux program with grbl-sim, patched to run in real time on a small ARM board, and exposes it as a serial port that CNCjs opens like a board. A run against it found and fixed five defects that the browser-only simulation could not show; see TESTING.md, "Grbl simulator run".

## Readable settings (2026-10-16)

Every screen is still scaled to fit without scrolling, except **Réglages**. It is marked `data-fit="scroll"`, so `viewport-fit.js` leaves it at full size and lets it scroll vertically. Opening the screen starts at the top, and later refits keep the reading position. `touch/settings-list.css` lays it out the way KlipperScreen does: one centred column of rows (title and description on the left, the control on the right), 19–22 px text, 60 px touch targets, and Affichage/Système tabs that stay at the top while the list scrolls. Système uses two columns with larger figures.

## Screen brightness (2026-10-16)

Affichage has a **Luminosité** card: a slider and −/+ buttons (steps of 10 %, never below 5 % so the screen can always be found again). It drives `/sys/class/backlight/*/brightness` on the computer running CNCjs through `GET`/`POST /api/touch-backlight` (`src/server/services/touch/backlight.js`). The last level is stored in `.cncrc` (`touch.backlight.percent`, written 2 s after the slider stops) and applied again when CNCjs starts, since the kernel resets it on boot.

The brightness file belongs to root, so CNCjs needs write access through a udev rule. On a Raspberry Pi OS style system where the CNCjs user is in the `video` group, run once:

```sh
echo 'ACTION=="add", SUBSYSTEM=="backlight", RUN+="/bin/chgrp video /sys/class/backlight/%k/brightness", RUN+="/bin/chmod g+w /sys/class/backlight/%k/brightness"' | sudo tee /etc/udev/rules.d/90-backlight.rules
sudo udevadm control --reload && sudo udevadm trigger --subsystem-match=backlight --action=add
```

Without it the card says the setting is blocked and sends nothing.

**Pendant la veille** (same card) chooses what the screen saver does with the backlight: *Écran éteint* (default, level 0), *Luminosité minimale* (5 %) or *Inchangée*. These are temporary levels: the server never stores them, and the first touch on the sleeping screen puts the operator's level back (`POST {wake: true}`). A page that loads while the panel may still be off sends the same wake request once. The choice is kept per browser (`localStorage`, `cncjs-touch-backlight-v1`).

## Preview performance pass (2026-10-16)

The G-code preview parser is 2.8–3.7× faster and the preview worker overlaps parsing with drawing; the full 20 MB pipeline runs in 55 % of its previous time on the development PC. Behaviour is unchanged (differentially fuzzed against the previous parser). See [TESTING.md](TESTING.md), "Preview pipeline measurements", for the numbers, the rejected approaches and the caveats. Measurements on the real touchscreen remain to be made: open a page with `?perf=1` and export the report (see TESTING.md, "Measuring on the device").

## Previous handoff (2026-10-16)

This update includes FR/EN/ES settings and exports; coordinate preparation, read-only machine limits and a compatible preview position marker inspired by Shopfloor Tablet; guarded local storage; bounded download cleanup; active-job screen-blanking inhibition; stricter state protocol validation; conservative time estimates; and fresh monitoring after network loss or page restoration. See [touch/THIRD-PARTY-NOTICES.md](touch/THIRD-PARTY-NOTICES.md).

**All offline checks pass (65/65 browser-side checks here, backend covered by the root Jest suite). Physical CNC validation remains outstanding.** Development is paused at the author’s request pending further review and testing by someone with an operational CNC.

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
