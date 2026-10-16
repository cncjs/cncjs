# Help wanted: hardware testing and completion

This prototype was developed by @storm8488 with AI coding assistance. The author currently cannot complete physical testing because an operational CNC is not available. Help from a contributor who already has a working CNC is the main reason for sharing this work.

## Suggested next steps

1. Review the architecture with CNCjs maintainers: decide whether to keep an isolated example, extract a standalone pendant or integrate selected parts into the main frontend.
2. ~~Replace the version-sensitive compiled-build patch with an agreed integration point~~ — done on 2026-10-16: the backend is in `src/server/services/touch` with routes in `src/server/app.js` (see README, "Server integration"). Still open: review authentication, stream cleanup, internal controller APIs and watch-directory behavior against current CNCjs master; agree on route names, server-side message language and error payload shape; serve `touch/index.html` as a CNCjs asset route.
3. Reproduce the offline suite and local demo. Review the existing French, English and Spanish resources, formatting and upstream test conventions.
4. Establish a documented hardware/browser matrix and an explicit supervised test plan with the machine owner. Distinguish mock results from actual machine results in all reports.
5. Validate existing job load/start/pause/resume/stop behavior on Grbl, including stale state, alarms, disconnection, controller replacement and conflicting clients. No automatic resume should be introduced.
6. Finish real jogging and work-origin operations only after their coordinate, unit, feed, bounds and cancellation semantics are agreed and independently checked. Current simulation and preflight behavior are not physical execution.
7. Complete physical probing only after calibrated probe geometry, tool diameter, search direction/distance/feed, contact state and recovery behavior are verified. Unknown values must remain unconfigured rather than guessed.
8. Measure performance and usability on the actual touchscreen under sustained load, including large-file previews, repeated navigation, Wi-Fi loss and screen blanking/wake. Review storage limits and accessible touch-target sizes.

## Reporting results

Include CNCjs revision, Node/browser version, controller/firmware, display resolution, test scenario, expected/actual behavior and whether the test was mocked, disconnected or physical. Remove credentials, private addresses and personal G-code from public logs. A passing mock test must not be recorded as a completed hardware test.

Development resumed on 2026-10-16 with the server integration above. The contribution is being submitted for review and continuation, not as a production-ready interface.

The contribution is intended to make this existing work reviewable and available for continuation. It does not claim that all features are finished or ready to merge.
