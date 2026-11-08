# BR0 browser retry — 2026-09-13 19:43 +0800

Status: **BLOCKED at port-selection entry interaction; no downstream gate is claimed.**

The fresh bundled Playwright run navigated to `http://127.0.0.1:8080/#/workspace` and captured `01-workspace.{png,html,aria.txt}`. Runtime metadata: Chromium 151.0.7922.34 from `/Users/cheton_wu/Library/Caches/ms-playwright`, viewport 1440×900, DPR 1, light theme, default GPU flags. The anonymous Workspace loaded and the Connection widget showed `Choose a port`; the Open button was disabled.

Fatal selector evidence: `#react-select-2-input` resolved to the React Select dummy input (`readonly`, class `css-62g3xt-dummyInput`) but was not visible. Its click timed out after 15,000 ms with Playwright reporting repeated `element is not visible`. Because the required port menu could not be opened, this run did not claim `/tmp/ttyGRBL` discovery/selection, connection, upload, workflow, jog, disconnect, watch-directory, or macro behavior. No `getByRole('option')` selector and no `data-test` attribute were used.

Durable evidence includes the exact fatal log in `browser.log`, the ARIA/HTML/screenshot baseline, lifecycle output, setup counts/hashes, and cleanup verification. Console/page/http evidence files were not produced because the fatal occurred before finalization; no claim is made about their absence.

The retry lifecycle was stopped after the fatal. Cleanup verification: TCP 8000 and 8080 had no listeners, and `/tmp/ttyGRBL` was absent. No source, ledger, plan, package file, or commit was changed.
