# Frontend patterns

All source paths below are relative to the repository root.

## Locate the change

| Path | Responsibility |
| --- | --- |
| `src/app/index.jsx`, `src/app/context.jsx` | Mounting and Query, Tonic UI, i18n, Redux, routing providers |
| `src/app/pages/` | Workspace, Administration, About |
| `src/app/containers/` | App shell, routing, header, login |
| `src/app/components/` | Shared presentational components |
| `src/app/queries/` | TanStack Query hooks and query keys |
| `src/app/reducers/`, `src/app/sagas/` | Existing application/session state |
| `src/app/widgets/` | Widget implementations and shared infrastructure |
| `src/app/lib/` | Client controller, config, i18n, DOM, units, logging |

## Conventions

- Use function components and hooks. Follow `.omp/RULES.md` for component
  interfaces, forms, Tonic UI, and normalization; do not maintain a second policy.
- Use Tonic components and `sx` for component styling, with existing Stylus
  modules for layout. Do not add `styled-components` or legacy UI packages
  listed in `scripts/ui-migration-allowlist.json`.
- Keep server state in query hooks using the shared `src/app/api/axios`
  instance. Mutations invalidate the relevant query key; presentational
  components should not make direct axios calls.
- Preserve the established Redux selector/action and saga flow for existing
  application/session state. Use local state or Query where new state does not
  need to be global.
- Import application modules through `@app`; icons come from
  `@tonic-ui/react-icons` or the Font Awesome packages.
- Workspace layout and widget lifecycle have dedicated procedures; do not add
  another widget registry or parallel persistence system.

When changing a shared component, inspect its callers and nearby tests. A new
widget may also need registry/layout changes; an existing widget behavior change
usually does not. User-visible strings require the localization workflow, not
an unreviewed manual replacement of generated keys.
