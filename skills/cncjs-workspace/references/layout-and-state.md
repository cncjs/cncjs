# Workspace layout, widget state, and persistence

The workspace shell is React plus a local immutable config store, not Redux.
Read the implementation and the nearest tests before changing a widget's host,
layout, configuration, or lifecycle.

## Read first

- Workspace shell: `src/app/containers/Workspace/Workspace.jsx`,
  `PrimaryWidgets.jsx`, `SecondaryWidgets.jsx`, `DefaultWidgets.jsx`,
  `Widget.jsx`, and `WidgetManager/`.
- Widget shell: `src/app/components/Widget/` (`Widget.jsx`, `Header.jsx`,
  `Controls.jsx`, `DropdownButton.jsx`, `index.styl`).
- Persistence: `src/app/store/index.js`, `src/app/store/defaultState.js`,
  `src/app/lib/immutable-store.js`.
- Widget config: `src/app/widgets/WidgetConfig.js`.
- Cross-boundary client: `src/app/lib/controller/Controller.js`,
  `src/app/lib/controller/index.js`, and the widget's `index.jsx`/state module.
- Server when relevant: `src/server/services/cncengine/CNCEngine.js`, the
  controller emit sites under `src/server/controllers/`, and
  `src/server/api/index.js`.
- Tests: the widget's `__tests__` if one exists, the Webcam component test, and
  the controller tests under `src/server/controllers/`.

## Architecture contract

- The widget registry is the explicit name-to-component map in
  `src/app/containers/Workspace/Widget.jsx`. `widgetId` is either `name` or
  `name:<uuid>`; the registry lookup uses the part before the colon. When
  adding or removing a widget, keep that map, the `WidgetManager` list, and the
  `widgets` keys in `src/app/store/defaultState.js` in sync.
- `[data-widget-id="<id>"]` is the workspace host anchor on the wrapper div in
  `DefaultWidgets`, `PrimaryWidgets`, and `SecondaryWidgets`. Sortable uses
  `dataIdAttr: 'data-widget-id'`, `handle: '.sortable-handle'`, and
  `filter: '.sortable-filter'`.
- Framed widgets render `role="region"` through
  `src/app/components/Widget/Widget.jsx`, with labels such as `Grbl widget` and
  `3D Visualizer widget`. Visualizer sets `borderless`; there is no unframed
  registry flag.
- Shell controls expose `aria-label="Collapse"`/`"Expand"`, `aria-expanded`,
  and a `More options` menu for fullscreen, fork, and remove. Fullscreen is
  widget-level React state plus a CSS-module class
  (`widget-fullscreen`), not a `data-*` attribute; entering fullscreen clears
  `minimized`. Bulk collapse/expand calls each widget's public `collapse()` or
  `expand()`.
- Layout lives in `workspace.container.{default,primary,secondary}`: `default`
  is the fixed set, and `primary`/`secondary` carry `widgets` and `show`.
  Persisted widget state lives under `widgets.<widgetId>`.
- `PrimaryWidgets` and `SecondaryWidgets` filter controller widgets against
  `controller.loadedControllers`; the default container is not sortable.
- `WidgetConfig` reads and writes `widgets["<widgetId>"]`. Fork clones the
  source widget settings into `widgets["<name>:<uuid>"]`; removing a forked
  widget unsets that branch. Every fork is isolated.
- `store` is an `ImmutableStore`, not Redux. It hydrates from
  `localStorage.cnc` (or Electron IPC), merges `defaultState`, normalizes the
  workspace lists, runs migrations, and persists changes through a 100 ms
  debounce. A parse failure sets `settings.error.corruptedWorkspaceSettings`.
  Persisted writes are local, not server writes.
- Config normalization forces the default widget list, makes primary unique
  and excludes default widgets, and makes secondary unique while excluding both
  primary and default. Do not write tests that expect duplicates or default
  widgets in sortable groups. `store.set` merges arrays, so list updates use
  `store.replace`.
- Workspace Settings import and restore persist the local config and reload
  the page. Export reads the local config and downloads it without reloading.
  Do not confuse this store with server machine-state, user, or record APIs.
- Controller data arrives through the `src/app/lib/controller` singleton:
  `startup` provides `loadedControllers`, `baudrates`, and `ports`;
  `serialport:open` sets `port` and `type`; `serialport:close` clears them;
  `controller:settings` and `controller:state` arrive as `(type, payload)`;
  `workflow:state`, `feeder:status`, `sender:status`, `gcode:load`, and
  `watchdir:change` drive workflow UI. Commands go through
  `controller.command(name, ...args)`, `write`, or `writeln`.
- `Controller.command`, `write`, and `writeln` are no-ops until `port` is set.
  Do not reimplement that gating in a widget or bypass it with the raw socket.

## Widget lifecycle and gating

- Controller widgets gate on the open port and the expected controller type.
  A widget starts as header-only unless exactly one controller is loaded or
  its controller type already matches. `serialport:open` then sets `isReady`
  from `controllerType`, and `serialport:close` restores the initial state.
- The Grbl widget renders its info button and command dropdown when `isReady`
  is true. `canClick()` requires a non-empty `port` and a matching controller
  type, and disables individual command items; it does not gate the info button
  or the dropdown's visibility.
- Widgets that add direct listeners (for example Grbl, Marlin, Axes, Console,
  Visualizer) must remove them on unmount; state consumers must ignore
  `controller:state` reports for another controller type. Prefer the existing
  widget's pattern over introducing a new subscription style.
- `serialport:close` clears the singleton's controller type/settings/state and
  workflow state; widgets restore their initial state. Verify the resulting
  disconnected UI rather than only the close callback.
- Do not add a second state or persistence mechanism, and do not reimplement
  connection gating that `Controller` already owns.

## Workflow

1. Trace the affected path: registry and host, widget state, config
   persistence, then the server event or API if used. Identify whether the
   change is local-only or cross-boundary.
2. Read the nearest existing tests before writing code. There is no widget test
   suite; reuse the Webcam test pattern for a focused component test, and the
   controller tests for a server contract.
3. Make the smallest source change. Keep JavaScript-only patterns, Stylus, and
   `i18n._` for user-facing strings.
4. Run source lint before manual checks: `yarn lint` (or `yarn eslint` while
   iterating). Fix Webpack ESLint overlays at source.
5. Run the narrow unit suite first, then the integration suite that crosses the
   changed boundary. Finish edits before the manual check; Webpack HMR rebuilds
   the app and there is no e2e runner to coordinate with.
6. Review the actual running app at the sizes and states you changed. Report
   the boundary you exercised and the evidence kind, not just "it works".
