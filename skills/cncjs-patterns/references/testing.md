# Test selection and repository checks

All paths below are relative to the repository root. Use the narrowest check
that proves the changed behavior; report the command and observed result.

## Test placement

| Suite | Config | Scope |
| --- | --- | --- |
| Node/server | `package.json` `jest` | Root `__tests__/`, server and simulator `__tests__/`; Node environment, server coverage |
| Frontend | `jest.frontend.config.js` | `src/app/**/__tests__/**/*.test.[jt]s?(x)`; jsdom, `@app` alias, style/file mocks |
| Browser | `test/e2e/` | Playwright scenarios and guarded integration fixtures |

- Put tests in adjacent `__tests__/` directories, named after the module.
  Use `.test.jsx` for JSX and `.test.js` otherwise. Root `__tests__/` is for
  repository-wide integration; controller tests stay with their controller.
- Use Jest, not the retired tap configuration.
- Frontend tests can use `renderAppUI` from `@app/test/render` for Query and
  Tonic providers. Mock controller, config, and network boundaries at the edge;
  assert rendered behavior rather than implementation details.
- Mock `service-container` for isolated API handler tests. Use a loopback
  Express fixture when middleware, body parsing, or HTTP status is in scope.
- A changed app/server contract needs integration evidence, not just independent
  mocks. Select the controller or workspace skill for that boundary's procedure.

```sh
yarn test --coverage=false <path>
yarn test:frontend --runInBand <path>
```

For browser work, read `test/e2e/README.md`. The runner uses an existing dev
server; it does not rebuild it. Use only isolated task-owned services, existing
API/Socket.IO guards, and the approved loopback simulator. Do not connect
physical hardware, cameras, or a user's server. Unit mocks, snapshots, simulator
execution, and visual inspection are different evidence; report them separately.

## Linting and hooks

- `package.json` is the current command inventory. `yarn lint` includes version
  drift, JSON translation, JavaScript, and Stylus checks.
- ESLint configuration is in `.eslintrc.js`; the JavaScript script covers
  `src/**/*.js`, `src/app/**/*.jsx`, and `scripts/**/*.js`.
- Formatting follows `.prettierrc.json` and the local inline-i18n plugin; do
  not reformat unrelated code.
- CI also exercises `yarn test:ui-migration` and `yarn check:ui-migration`.
  Use these when changing migration constraints or affected UI patterns.
- Husky uses commitlint on `commit-msg` and lint on `pre-push`. Passing tests
  does not replace those checks; report unavailable checks explicitly.
