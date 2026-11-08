# UI migration gate

Run `yarn test:ui-migration` and `yarn check:ui-migration`. CI runs both before the existing Node tests on each platform. The checker uses the declared `@babel/core` parser/traverse APIs; it does not execute application modules. `--root <project>` supports isolated fixture projects. Errors include file, line and rule; violations, parse errors and missing sources exit nonzero.

The production scan covers all JS/JSX under `src/app`, excluding `__tests__`. It resolves `@app`, `app`, relative files and index barrels; follows ESM named/star/namespace exports, CommonJS bindings/exports, literal dynamic imports, aliases, classes and indirect inheritance. Nonliteral module loading fails closed. React classes/factories, obsolete fetch abstractions, legacy UI imports/dependencies/directories and component instance APIs are rejected. DOM/media refs and controller commands remain valid.

`scripts/ui-migration-allowlist.json` is the named policy. HTTP boundaries use complete file paths, roles and reasons; no directory wildcard is accepted. Query hooks must reach Query read/mutation hooks. Pure query options may flow to `useQuery` or client prefetch/fetch APIs; calling their `queryFn` directly from UI is rejected. Raw pure HTTP functions, including functions renamed to start with `use`, cannot bypass the boundary. Non-React auth/bootstrap/transport owners cannot call React/Query hooks. Dashboard's download exception permits only `api.downloadGCode`, with no API object escape or other mutation.

Domain classes require exact file/name/reason entries. This permission never overrides React inheritance detection. Shared component families require a domain reason and a test. The manifest implements the reviewed P6 reconciliation; add exceptions only after reviewing the real owner, consumers and tests.

`fixtures/ui-migration.json` and `__tests__/ui-migration.test.js` exercise positive and adversarial projects and CLI exit codes. Static analysis protects these syntax/import/binding contracts; it does not prove dynamic runtime or browser behavior. R6 remains responsible for browser/performance evidence and W3 for the final integrated gate.
