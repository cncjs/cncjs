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

- Many handlers use `res.send(...)` and status constants from
  `src/server/constants`; others have different response needs. For example,
  `api.gcode.download` writes and ends an attachment response. Follow the
  endpoint's response contract rather than assuming all handlers return JSON.
- Preserve existing service boundaries without assuming every operation belongs
  to a service: handlers also access `configstore` or the controller store
  directly. In `src/server/api/api.watch.js`, the monitor import is
  `../services/monitor`; the adjacent `__tests__/api.watch.test.js` uses
  `../../services/monitor` for its mock.
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
