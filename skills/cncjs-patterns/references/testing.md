# Test selection and repository checks

All paths below are relative to the repository root. Use the narrowest check
that proves the changed behavior; report the command and observed result.

## Test placement

| Suite | Config | Scope |
| --- | --- | --- |
| Jest | `package.json` `jest` | `src/app/**/__tests__/**/*.test.js`, `src/server/**/__tests__/**/*.test.js`, and `grbl-simulator/__tests__/**/*.test.js`; Node environment; coverage collected from `src/server/**` |

- Put tests in adjacent `__tests__/` directories, named after the module.
  `testMatch` accepts only `.test.js`; a `.test.jsx` file will not run. Keep JSX
  out of tests or use `React.createElement`.
- Use Jest, not the retired tap configuration.
- App tests run in Node without jsdom. Follow
  `src/app/components/Webcam/__tests__/Webcam.test.js`: mock `app/lib/*`
  modules, stub globals, and instantiate the class component directly. There is
  no shared frontend render helper.
- API handler tests mock the owning service (for example,
  `jest.mock('../../services/monitor')`) and use minimal `req`/`res` objects;
  see `src/server/api/__tests__/api.watch.test.js`.
- Controller tests use the in-process `grbl-simulator` and
  `src/server/controllers/__tests__/helpers/createController.js`; see
  `GrblController.autolevelSimulator.test.js`. Do not connect physical
  hardware.
- A changed app/server contract needs integration evidence, not just independent
  mocks. Select the controller or workspace skill for that boundary's procedure.

```sh
yarn test --coverage=false <path>
yarn test
```

Unit mocks, simulator execution, snapshots, and visual inspection are different
evidence; report them separately.

## Linting and repository checks

- `package.json` is the current command inventory. `yarn lint` runs `i18nlint`,
  `eslint`, and `stylint` concurrently.
- `yarn eslint` covers `src/**/*.js`, `src/app/**/*.jsx`, and `scripts/**/*.js`.
  ESLint configuration is in `.eslintrc.js` and extends `trendmicro`.
- `yarn i18nlint` validates JSON syntax only; see `cncjs-i18n` for completeness
  and placeholder checks.
- `yarn stylint` checks `src/app`.
- CI in `.github/workflows/ci.yml` runs `yarn lint` and `yarn test` on Node.js
  24.
- This checkout has no Prettier, Husky, lint-staged, or commitlint setup. Do not
  report those as checks.
- Do not connect physical machines or cameras, and do not modify a user's
  running server. Controller tests use the in-process simulator; temporary files
  must be task-owned.
