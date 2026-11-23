# Extract CNCjs strings

Paths and commands here are relative to the repository root.

## Call sites and namespace ownership

| Surface | Scanner-managed | Manual |
| --- | --- | --- |
| Frontend | `gcode`, `resource` | `controller` |
| Server | `resource` | `config` |

- Frontend: follow the existing `i18n._('English text', { ... })` pattern.
  The custom transform also recognizes `i18n.__` and treats string keys
  literally, without namespace or key separators. Pass `{ ns: 'gcode' }` for
  G-code labels, as in `src/app/lib/gcode-text.js`. Use explicit keys such as
  `i18n.t('controller:Grbl.activeState.idle')` for the manual namespace.
- Server: follow `i18n.t` or `t`, as in `t('loading')` in `src/server/app.js`.
  The custom transform also recognizes `i18n._` and `i18n.__` and treats their
  keys literally, without namespace or key separators.
- Maintain `src/app/i18n/<language>/controller.json` and
  `src/server/i18n/<language>/config.json` manually. Check usages before
  deleting any key. Do not scan solely for a manual-namespace edit.

## Run only the relevant scanner

Inspect the working tree first and preserve existing edits. For source changes
in scanner-managed namespaces, use only the full invocation for the affected
surface (both only if both changed). When adding a language, use the applicable
full invocation to seed managed resources and handle manual files separately.
The server config has no default input glob. Never narrow the input to changed
files: both scanners remove unused `resource` keys, so a partial scan can
remove keys still in use elsewhere. The app scanner retains unused `gcode` keys.

```sh
yarn i18next-scanner --config i18next-scanner.app.config.js 'src/app/**/*.{html,js,jsx}' '!src/app/i18n/**' '!**/node_modules/**'
yarn i18next-scanner --config i18next-scanner.server.config.js 'src/server/**/*.{html,js,jsx}' '!src/server/i18n/**' '!**/node_modules/**'
```

Review the full generated diff for unrelated deletions or rewrites. For new
keys, the frontend scanner uses the key as the English value and an empty
value for other languages. The server default is `__L10N__`; a nonempty
call-site default can supply another value, including for multiple languages.
Replace placeholders with verified translations where in scope. Do not
overwrite valid translations.

## Build side effects

The build scripts run both scanners and synchronize `src/package.json`.
`yarn dev` starts with `build-dev`, which clears `output/*`; `yarn build`
invokes `build-prod`, which clears `dist/*`. `yarn build-latest` also clears
`dist/*` and stamps a commit-suffixed version into `src/package.json`.
`yarn win-dev` removes and recreates `output`. Inspect affected paths and
preserve existing data and edits. Ask before deleting generated or untracked
user data unless the exact deletion was authorized. Do not use builds merely
to extract or validate translations.
