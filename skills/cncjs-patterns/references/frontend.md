# Frontend patterns

All source paths below are relative to the repository root.

## Locate the change

| Path | Responsibility |
| --- | --- |
| `src/app/index.jsx` | Mounting, i18next initialization, GridSystem and Router providers, controller connection |
| `src/app/containers/` | App shell and routes (`App.jsx`), Header, Sidebar, Login, Settings, Workspace |
| `src/app/components/` | Shared presentational components |
| `src/app/widgets/` | Widget implementations and `WidgetConfig.js` |
| `src/app/store/` | Application and session state backed by `src/app/lib/immutable-store.js`, plus `defaultState.js` |
| `src/app/api/index.js` | Superagent-based API client used by containers and widgets |
| `src/app/lib/` | Client controller, config, i18n, units, logging, DOM and Three.js helpers |
| `src/app/styles/`, `*.styl` | Global and component Stylus styles |

## Conventions

- Existing React 15.6 components are generally classes (`Component` or
  `PureComponent`), often with static `propTypes`, `defaultProps`, instance
  fields, and lifecycle methods. Preserve their behavior when changing them; do
  not add `propTypes`, hooks, or another component library.
- Use the existing shared components and `@trendmicro/react-*` packages. Style
  with Stylus modules imported as `styles` plus global `src/app/styles`; do not
  add CSS modules or Sass.
- Import application modules with the `app/...` prefix, resolved from `src`.
  The webpack alias `@app` exists, but existing code uses `app/...`. Jest maps
  `app/...` to `src/app/...`.
- Call server APIs through `src/app/api/index.js`. It applies the bearer token
  from `store.get('session.token')`; do not bypass it with direct HTTP calls in
  components or widgets.
- Keep application and session state in the existing store and controller event
  flow. Use component state only for local UI state.
- Widget layout, lifecycle, and persistence have a dedicated procedure; do not
  add another widget registry or persistence mechanism.
- User-visible strings require the localization workflow, not an unreviewed
  manual replacement of generated keys.

When changing a shared component, inspect its callers and nearby tests. A new
widget may also need workspace registry or layout changes; an existing widget
behavior change usually does not.
