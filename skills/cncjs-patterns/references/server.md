# Server patterns

All source paths below are relative to the repository root.

## Locate the change

| Path | Responsibility |
| --- | --- |
| `src/server-cli.js` | CLI entry and option parsing |
| `src/server/index.js` | Server creation and startup |
| `src/server/app.js` | Express application, middleware, i18next, and API route registration |
| `src/server/api/` | Handler modules (`api.*.js`) exporting named route handlers; `index.js` aggregates them |
| `src/server/services/` | Singletons `cncengine`, `configstore`, `monitor`, and `taskrunner` exported from `index.js` |
| `src/server/config/settings.base.js` | Defaults merged with environment settings; runtime config is loaded from `.cncrc` by `configstore` |
| `src/server/controllers/` | Grbl, Marlin, Smoothie, and TinyG implementations |
| `src/server/lib/` | Server utilities |
| `src/server/constants/index.js` | HTTP status constants |

## Conventions

- Handlers use `res.send(...)` and status constants in `src/server/constants`.
  Keep filesystem, shell, persistence, and controller work in the owning service
  rather than copying it into route handlers.
- Import service singletons directly from `src/server/services` or their module
  (for example, `../../services/monitor`); isolated handler tests mock the
  service module.
- Use the narrowest `ensure-type` helper at untrusted boundaries such as request
  parameters, bodies, and controller input. Do not add a second normalization
  path inside otherwise trusted application code.
- Keep defaults in `settings.base.js`, not as parallel route-level settings.
  Register new API routes in `src/server/app.js` and export handlers from
  `src/server/api/index.js`.

An API change may require route registration, handler tests, and settings or
constants. A service change also needs checks at any affected handler boundary.
Controller protocol changes require tracing the corresponding app consumer, not
just the server implementation.
