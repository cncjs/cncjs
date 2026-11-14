# Server patterns

All source paths below are relative to the repository root.

## Locate the change

| Path | Responsibility |
| --- | --- |
| `src/server/index.js` | Process and CLI startup |
| `src/server/app.js` | Express application and middleware |
| `src/server/routes/api.js` | Public and protected route registration |
| `src/server/api/` | Resource modules exporting route-handler objects |
| `src/server/services/` | Services registered in `service-container.js` |
| `src/server/config/settings.base.js` | Defaults, overridden by `.cncrc` and settings |
| `src/server/controllers/` | Grbl, Marlin, Smoothie, TinyG implementations |
| `src/server/lib/` | Server utilities |

## Conventions

- Handlers use `res.send(...)` and status constants in `src/server/constants`.
  Keep filesystem, shell, persistence, and controller work in the owning
  service rather than copying it into route handlers.
- Resolve singleton services through `src/server/service-container.js`
  (awilix). Register new services there; isolated handler tests can mock that
  boundary without building the controller graph.
- Apply `.omp/RULES.md` when normalizing untrusted inputs. Do not add a second
  normalization path inside otherwise trusted application code.
- Keep defaults in `settings.base.js`, not as parallel route-level settings.

An API change may require route registration, handler tests, and settings or
constants. A service change also needs checks at any affected handler boundary.
Controller protocol changes require tracing the corresponding app consumer, not
just the server implementation.
