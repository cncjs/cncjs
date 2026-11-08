# R0 原版 baseline

建立日期：2026-09-13。此 baseline 以既有 cncjs source 為對照，尚未套用 Tonic widget 架構重構。

## Revision / environment

- Repository: `feat/tonic-ui-v2-migration`
- Plan commit: `39edd31597df411bf8553d0cf41ff945cade340c`
- Source baseline reference: `f301cde7`（既有 `geometry-baseline.json` 的只讀量測）
- Working-tree change intentionally present: `src/app/widgets/Connection/Connection.jsx` 的 React Select selector/accessibility patch；不改 selection 或 connection behavior。
- Runtime: Node `v24.15.0`、Yarn `3.3.1`、React 18.3.1、Jest 29。
- Browser baseline: BR0 已依使用者明確 waiver 延後；已保存的 bundled Chromium partial evidence 為 headless、DPR 1、light、1440×900/768×900，GPU disabled。完整 browser workflow 不在本 R0 結果中宣稱通過。

## Verified passing behavior

| Area | Command / artifact | Result |
| --- | --- | --- |
| F2 frontend harness and existing characterization | `yarn test:frontend --runInBand` | 5 suites / 9 tests passed |
| Provider lifecycle | `src/app/test/__tests__/providers.test.jsx` | passed in frontend suite |
| Deferred lifecycle utility | `src/app/test/__tests__/deferred.test.js` | passed in frontend suite |
| Visualizer load behavior | `src/app/widgets/Visualizer/__tests__/loadGCode.test.jsx` | passed in frontend suite |
| WebGL warning behavior | `src/app/widgets/Visualizer/__tests__/webglWarning.test.js` | passed in frontend suite |
| G-code statistics / date-fns v4 compatibility | `src/app/widgets/GCode/__tests__/GCodeStats.test.js` | passed in frontend suite |
| Existing geometry oracle | [geometry-baseline.json](geometry-baseline.json) | real parser/Three.js read-only probe; 3 arc fixtures, 3 frames and 32 vertices each |
| Dev lifecycle | `CONFIG_PATH=/tmp/cncjs-browser-test.cncrc SUPPRESS_WEBGL_WARNING=1 yarn dev` | simulator/frontend/backend started and cleaned; ports 8000/8080 and `/tmp/ttyGRBL` absent after cleanup |

## Known pre-existing / excluded results

- `yarn test --runInBand`: 508 passed, 1 existing failure in `src/server/lib/__tests__/SocketConnection.test.js` (`ECONNRESET`). The user explicitly requested that SocketConnection test be skipped from the active path; it is not used as an R0 pass criterion.
- Jest reports a haste-module naming collision between `src/package.json` and `dist/cncjs/package.json`; the frontend suite still completed 5/5.
- BR0 partial evidence proves connection, small upload, Run/Pause/Resume only. The missing Stop/jog/disconnect/large/watch/viewport/new-selector browser cases are carry-forward, not approved passing behavior.

## Approved differences / carry-forward

- BR0 is `waived` by explicit user direction. R0 is allowed to proceed with source/unit characterization; R6 must rerun equivalent browser and performance gates before final delivery.
- Approved-by-plan behavior differences to preserve in later integration tests: fullscreen ignores collapse, Macro refresh keeps cached data, failed mutations do not close optimistically, and Settings waits for Save completion.
- Visualizer load-signature mismatch 已由 `Visualizer/__tests__/loadGCode.test.jsx` 覆蓋（three-argument `load(name, gcode, callback)`）；`Console` `term.current.clear` crash 已由 `98ceb1f6` 修正，並由 `Console/__tests__/Console.test.jsx` 以真 wrapper shape 驗證。E1/R4 仍未完成的部分是 `useTerminal` owner-action 架構（T2），不是這兩個 crash。
- The React Select selector patch is testability/accessibility-only. A future Tonic `MenuButton/MenuList/MenuItem` replacement requires a separate task and compatibility proof for keyboard, focus, selected value, disabled, ARIA/i18n, metadata, and callbacks.

## R0 conclusion

The non-browser baseline is reproducible and recorded. R0 may be marked completed for this waived path; the browser carry-forward remains an explicit final-gate obligation and is not represented as green evidence.
