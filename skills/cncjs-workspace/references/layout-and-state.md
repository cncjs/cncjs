# Workspace layout, widget state, and persistence

The workspace shell is React plus a local config store, not Redux. Read the
implementation and the nearest tests before changing a widget's host, layout,
configuration, or lifecycle.

## Read first

- Workspace shell: `src/app/pages/Workspace/widgetRegistry.js`, `Widget.jsx`,
  `WorkspaceLayoutProvider.jsx`, `widgetLayoutState.js`, `useWidgetGroup.js`,
  `PrimaryWidgets.jsx`, `SecondaryWidgets.jsx`, `DefaultWidgets.jsx`,
  `widget-manager/`.
- Widget shell: `src/app/components/Widget/Widget.jsx` and `index.styl`.
- Persistence: `src/app/store/config/index.js`, `EventEmitterStore.js`,
  `hydration.js`, `defaultState.js`.
- Widget config: `src/app/widgets/shared/WidgetConfigProvider.jsx`,
  `useWidgetConfig.js`, `WidgetConfig.js`, `utils.js`.
- Cross-boundary client: `src/app/lib/CNCJSController.js`,
  `src/app/runtime/connectionRuntime.js`, and the widget's `index.jsx`/state
  module.
- Server when relevant: `src/server/service-engine.js`, the controller emit
  sites under `src/server/controllers/`, and `src/server/routes/api.js`.
- Tests: the widget's `__tests__`, `src/app/pages/Workspace/__tests__/`, and
  the matching `test/e2e/scenarios/*.spec.mjs`.

## Architecture contract

- `WIDGET_REGISTRY` is the single registry for 17 widget IDs. `hasFrame: false`
  means the widget bypasses the workspace shell; Visualizer is the current
  unframed widget. `controllerType` gates visibility through
  `selectVisibleWidgetIds`.
- `[data-widget-id="<id>"]` is the workspace host anchor. Forked IDs are
  `<name>:<uuid>`; the registry lookup uses the part before the colon.
  `widget(page, id)` in `test/e2e/support/fixtures.mjs` targets this host, with
  a Visualizer-specific label.
- Framed widgets render `role="region"` with labels such as `Axes widget`.
  Shell controls expose `aria-label="Collapse"`/`"Expand"`, `aria-expanded`,
  and a `More options` menu. The generic shell has no `data-fullscreen`
  attribute (Autolevel's custom shell does); assert computed layout for the
  generic shell.
- Layout lives in `workspace.container.{default,primary,secondary}`: `default`
  is the fixed set, `primary`/`secondary` carry `widgets` and `show`. Persisted
  widget state lives under `widgets.<widgetId>`.
- `WorkspaceLayoutProvider` reads config through `useSyncExternalStore`, keeps
  collapsed snapshots referentially stable, and keeps fullscreen in React state
  only. Entering fullscreen also clears `minimized` for that widget. Bulk
  collapse skips unframed and currently fullscreen widgets.
- `WidgetConfigProvider` memoizes `config.get(['widgets', widgetId])` as its
  initial state. `useWidgetConfig` writes through `translatePathByWidgetId`, so
  every fork has an isolated `widgets.<id>` branch.
- `config` is an `EventEmitterStore`, not Redux. It hydrates from
  `localStorage.cnc` (or Electron IPC), normalizes the workspace lists, runs
  migrations, and persists changes through a 100 ms debounce. Persisted writes
  are local, not server writes.
- Controller data arrives through `CNCJSController`: `startup` provides
  `availableControllers`; controllers emit `controller:settings` and
  `controller:state` as `(type, payload)`; `connection:open`/`connection:close`
  drive connected state; `workflow:state`, `feeder:status`, `sender:status`,
  and `watchdir:change` drive workflow UI. Commands go through
  `controller.command(name, ...args)`, `write`, or `writeln`.
- Workspace Settings import/export/restore operates on the local config and
  reloads the page. It does not persist workspace layout to `/api/state`. Do
  not confuse the local config store with the server's user store or record
  APIs.
- Config normalization forces the default widget list, primary excludes
  default widgets, and secondary excludes both. Do not write tests that expect
  duplicates or default widgets in sortable groups.

## Widget lifecycle and gating

- Controller widgets gate on connected state and the expected controller type.
  The Grbl widget shows its info and command controls only when
  `connection.state === 'connected'` and the type is `Grbl`. Controller
  widgets are header-only until `startup.availableControllers` includes their
  type.
- Widgets that add direct listeners (Marlin, Visualizer, Console) must remove
  them on unmount; state consumers must ignore `controller:state` reports for
  another controller type. Prefer the existing widget's pattern over
  introducing a new subscription style.
- `connection:close` resets controller type/settings/state and workflow to
  idle; verify the resulting disconnected UI rather than only the close
  callback.
- Do not add a second state or persistence mechanism, and do not reimplement
  connection gating that `connectionRuntime` already owns.

## Workflow

1. Trace the affected path: registry and host, widget state, config
   persistence, then the server event or API if used. Identify whether the
   change is local-only or cross-boundary.
2. Read the nearest existing tests before writing code. Reuse their fixtures,
   selectors, and state assertions rather than inventing a second convention.
3. Make the smallest source change. Keep JavaScript-only patterns, Stylus, and
   `i18n._` for user-facing strings.
4. Run source lint before browser work: `yarn lint` (or `yarn eslint` while
   iterating; `eslint test/e2e --ext .mjs --max-warnings 0` after touching
   specs). Fix Webpack ESLint overlays at source.
5. Run the narrow unit suite first, then the integration suite that crosses the
   changed boundary. Finish edits before browser verification; the e2e runner
   does not rebuild the app.
6. Review actual screenshots and results when captures are enabled. Report the
   boundary you exercised, not just "tests pass".
