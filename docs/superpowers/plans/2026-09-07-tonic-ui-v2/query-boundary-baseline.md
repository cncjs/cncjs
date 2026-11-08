# HTTP Query Boundary Baseline

Task / source commit: B0 / `f41faac9`

Command / exit code: `rg -n "from ['\"](@app/)?api|from ['\"]axios|require\(['\"]axios|useFetch|useAsync|api\." src/app --glob '*.{js,jsx}'` / 0.

This inventory records direct imports that can issue HTTP requests. Comments and
the `src/app/api/**` transport implementation are not React consumers.

| File | Symbol / endpoint | Kind | Owner task | Decision |
| --- | --- | --- | --- | --- |
| `lib/user.js` | `api.signin`, `/api/signin` | mutation | B1 | Allowed pure authentication transport/token persistence; React caller moves to session mutation. |
| `sagas/app/bootstrap.js` | axios session/bootstrap requests | bootstrap | B1 | Allowed non-React caller; reuse pure query transport, never a hook. |
| `containers/app/LoginPage.jsx` | axios `GET api/state`; `user.signin` | read + mutation | B1 | Direct React transport; replace with session query/mutation boundary. |
| `widgets/Macro/index.jsx` | axios `GET /api/macros` | read | M1/M3 | Direct React transport via XState; migrate to shared Macro query. |
| `widgets/Macro/modals/NewMacro.jsx` | axios `POST /api/macros` | mutation | M2/M3 | Direct React transport; migrate to Macro mutation. |
| `widgets/Macro/modals/EditMacro.jsx` | axios `PUT/DELETE /api/macros/:id` | mutation | M2/M3 | Direct React transport; migrate to Macro mutations. |
| `widgets/Axes/index.jsx` | `api.mdi.fetch()` | read | A1b | Direct React transport; migrate to widget Query module. |
| `widgets/Axes/Settings/index.jsx` | `api.mdi.bulkUpdate()` | mutation | A1b | Direct React transport; migrate to widget mutation. |
| `widgets/Axes/Settings/MDI/MDI.jsx` | `api.mdi.fetch()` | read | A1b | Direct React transport; migrate with MDI owner. |
| `widgets/Tool/index.jsx` | `api.getToolConfig`, `api.setToolConfig` | read + mutation | A2 | Direct React transport; migrate to Tool query/mutation. |
| `widgets/Autolevel/index.jsx` | `api.loadGCode` | mutation | A3b | Direct React transport; migrate to shared load-GCode mutation. |
| `pages/Workspace/Workspace.jsx` | `api.loadGCode` | mutation | W1 | Direct React transport; migrate to shared load-GCode mutation. |
| `widgets/Visualizer/WatchDirectory.jsx` | `api.watch.getFiles` | read | V1 | Direct React transport; migrate to path-keyed Watch query. |
| `widgets/Visualizer/SecondaryToolbar.jsx` | `api.machines.fetch` | read | V1 | Direct React transport; reuse Machines query cache. |
| `widgets/Visualizer/Dashboard.jsx` | `api.downloadGCode` | browser download | V1 | Allowed browser form/download transport; verify token, metadata, and one trigger. |
| `__deprecated/TopNav.old/TopNav.jsx` | state/version/commands requests | deprecated UI | P0 | No exception. Confirm consumer status, then remove or migrate only if live. |
| `pages/*/queries.js` Administration About/GeneralSettings/Users/WorkspaceSettings/Commands/Events/Machines/Macros | axios resource requests | Query transport | owning page / M1 | Allowed query modules. Macro module moves to shared `src/app/queries/macros.js` in M1. |
| `hooks/useAsync.js`, `hooks/useFetch.js` | generic async/fetch wrapper | generic hook | W3 audit | Not a boundary exception for new server-state flows; retain until consumer audit proves removal is safe. |

## Explicit non-HTTP exceptions

- `controller.command` / `controller.write` and Socket.IO remain realtime
  machine transport; do not put them in Query.
- `api.downloadGCode` is a browser form submit, not cacheable server state.
- Local config, assets, and storage stay with their existing owners.

## Required follow-up checks

1. B1 resolves LoginPage, bootstrap, and authentication storage.
2. M1–M3 resolve all Macro rows, including error paths that currently ignore
   failures.
3. A1b, A2, A3b, V1, and W1 resolve their named owner rows.
4. B3 turns this baseline into AST enforcement with file-specific exceptions.

Remaining untested paths: this is an import/callsite baseline only; no
transport was invoked and no browser or controller behavior is claimed.

## B3 final reconciliation — 2026-10-01

The original B0 rows above remain historical evidence. Every row now resolves to a query owner, a named non-React/browser exception, or a deleted source. The executable policy is [ui-migration-allowlist.json](../../../../scripts/ui-migration-allowlist.json); no wildcard directory grants transport permission.

| Original B0 source / flow | Current owner / decision |
| --- | --- |
| lib/user.js authentication | Named pure transport/token-persistence exception; React signin uses queries/session.js. isAuthenticated is a local storage read, not HTTP. |
| sagas/app/bootstrap.js session/state | Named non-React bootstrap exception; imports pure signin from queries/session.js, never a hook. No saga edits in B3. |
| LoginPage signin and GET api/state | useSigninMutation plus new useAppStateQuery → fetchAppState → existing axios; the last direct state GET is removed. Failed state read releases pending state without retry/analytics/controller connect. |
| Macro index / NewMacro / EditMacro | queries/macros.js query/mutation hooks; old shell/body ownership is function based. |
| Axes index / Settings / legacy Settings/MDI/MDI.jsx | widgets/Axes/queries.js useMdiQuery/useSaveMdiMutation; legacy MDI path removed. |
| Tool index read/save | widgets/Tool/queries.js hooks. |
| Autolevel and Workspace load-G-code | queries/gcode.js useLoadGCodeMutation. |
| Visualizer WatchDirectory | widgets/Visualizer/queries.js key/options/fetchWatchDirectory; React uses Query and client prefetch with pure options, with no direct queryFn call. |
| Visualizer SecondaryToolbar machines | Named pages/Administration/Machines/queries.js shared Query hooks/cache. |
| Visualizer Dashboard download | Exact download exception restricted to api.downloadGCode; Toolbars.test.jsx proves one action. Browser URL/token/metadata evidence remains R6. |
| TopNav.old | Deleted in P3; no consumer. |
| Administration/About queries | All exact module paths below; Macros queries re-export shared hooks. |
| hooks/useFetch.js / useAsync.js | No consumers; both removed in B3. Their imports and obsolete fetch services are rejected by the gate. |

### Exact HTTP boundary files

| Full file path | Role / rationale |
| --- | --- |
| `src/app/queries/macros.js` | query: Named resource query key/functions and TanStack Query hooks; React consumers use hook exports. |
| `src/app/queries/gcode.js` | query: Named resource query key/functions and TanStack Query hooks; React consumers use hook exports. |
| `src/app/queries/session.js` | query: Named resource query key/functions and TanStack Query hooks; React consumers use hook exports. |
| `src/app/queries/serialport.js` | query: Named resource query key/functions and TanStack Query hooks; React consumers use hook exports. |
| `src/app/queries/appState.js` | query: Named resource query key/functions and TanStack Query hooks; React consumers use hook exports. |
| `src/app/widgets/Axes/queries.js` | query: Named resource query key/functions and TanStack Query hooks; React consumers use hook exports. |
| `src/app/widgets/Tool/queries.js` | query: Named resource query key/functions and TanStack Query hooks; React consumers use hook exports. |
| `src/app/widgets/Visualizer/queries.js` | query: Named resource query key/functions and TanStack Query hooks; React consumers use hook exports. |
| `src/app/pages/Administration/Commands/queries.js` | query: Named resource query key/functions and TanStack Query hooks; React consumers use hook exports. |
| `src/app/pages/Administration/Events/queries.js` | query: Named resource query key/functions and TanStack Query hooks; React consumers use hook exports. |
| `src/app/pages/Administration/Machines/queries.js` | query: Named resource query key/functions and TanStack Query hooks; React consumers use hook exports. |
| `src/app/pages/Administration/Macros/queries.js` | query: Named resource query key/functions and TanStack Query hooks; React consumers use hook exports. |
| `src/app/pages/Administration/Users/queries.js` | query: Named resource query key/functions and TanStack Query hooks; React consumers use hook exports. |
| `src/app/pages/Administration/GeneralSettings/queries.js` | query: Named resource query key/functions and TanStack Query hooks; React consumers use hook exports. |
| `src/app/pages/Administration/WorkspaceSettings/queries.js` | query: Named resource query key/functions and TanStack Query hooks; React consumers use hook exports. |
| `src/app/pages/About/queries.js` | query: Named resource query key/functions and TanStack Query hooks; React consumers use hook exports. |
| `src/app/api/index.js` | transport: Existing API HTTP/download implementation. |
| `src/app/api/axios.js` | transport: Existing shared axios configuration. |
| `src/app/lib/user.js` | transport: Pure authentication transport and token persistence. |
| `src/app/sagas/app/bootstrap.js` | transport: Existing non-React app/session bootstrap transport; only pure query exports allowed. |
| `src/app/widgets/Visualizer/Dashboard.jsx` | download: Browser G-code download form submission, not cacheable HTTP server state; only api.downloadGCode permitted. |

All React raw HTTP imports/mutations and old fetch-service identifiers are zero at the final gate. Socket/controller commands, PubSub and local configuration keep their existing owners. The gate also enforces P6's named domain classes/families without granting a React class exception. Production tests exclude fixture projects; fixture tests run separately through test:ui-migration.
