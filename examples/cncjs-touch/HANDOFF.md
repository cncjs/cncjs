# Help wanted: hardware testing and completion

This prototype was developed by @storm8488 with AI coding assistance. The author currently cannot complete physical testing because an operational CNC is not available. Help from a contributor who already has a working CNC is the main reason for sharing this work.

## Suggested next steps

1. Review the architecture with CNCjs maintainers: decide whether to keep an isolated example, extract a standalone pendant or integrate selected parts into the main frontend.
2. ~~Replace the version-sensitive compiled-build patch with an agreed integration point~~ — done on 2026-10-16: the backend is in `src/server/services/touch` with routes in `src/server/app.js` (see README, "Server integration"). Also done on 2026-10-16: `touch/index.html` is served by CNCjs at `/touch/` (`settings.assets.touch`), and the routes were exercised end to end behind the real JWT check from a `yarn start-server-dev` process with a local user account and a watch directory, without any controller (see TESTING.md, "Integrated server run"). Also done on 2026-10-16: the production build of this branch runs on the author's Surface RT (PM2 process `cncjs-next` in `/home/pi/cncjs-next`, reusing the global 1.11.5 `node_modules`; the previous install is kept stopped under PM2 and `/home/pi/cncjs-rollback.sh` switches back), serving the touch pages through the `/touch` mount point of `.cncrc`; the kiosk connects to the integrated event stream, without a controller attached. Still open: review authentication, stream cleanup, internal controller APIs and watch-directory behavior against current CNCjs master; agree on route names, server-side message language and error payload shape; decide whether the static-assets-before-session ordering in `src/server/app.js` (added to stop `session-file-store` rename races under Windows) is acceptable upstream; validate with a Grbl controller attached.
3. Reproduce the offline suite and local demo. Review the existing French, English and Spanish resources, formatting and upstream test conventions.
4. Establish a documented hardware/browser matrix and an explicit supervised test plan with the machine owner. Distinguish mock results from actual machine results in all reports.
5. Validate existing job load/start/pause/resume/stop behavior on Grbl, including stale state, alarms, disconnection, controller replacement and conflicting clients. No automatic resume should be introduced. Added on 2026-10-16 without a controller and therefore also awaiting validation: feed/spindle overrides during a job, CNCjs macros behind the confirmation dialog, and the acknowledged-line progress trail on the preview (see README, "Job progress, overrides and macros").
6. Finish real jogging and work-origin operations only after their coordinate, unit, feed, bounds and cancellation semantics are agreed and independently checked. Current simulation and preflight behavior are not physical execution.
7. Complete physical probing only after calibrated probe geometry, tool diameter, search direction/distance/feed, contact state and recovery behavior are verified. Unknown values must remain unconfigured rather than guessed.
8. Measure performance and usability on the actual touchscreen under sustained load, including large-file previews, repeated navigation, Wi-Fi loss and screen blanking/wake. Review storage limits and accessible touch-target sizes.

## Reporting results

Include CNCjs revision, Node/browser version, controller/firmware, display resolution, test scenario, expected/actual behavior and whether the test was mocked, disconnected or physical. Remove credentials, private addresses and personal G-code from public logs. A passing mock test must not be recorded as a completed hardware test.

Development resumed on 2026-10-16 with the server integration above. The contribution is being submitted for review and continuation, not as a production-ready interface.

The contribution is intended to make this existing work reviewable and available for continuation. It does not claim that all features are finished or ready to merge.
