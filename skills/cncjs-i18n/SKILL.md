---
name: cncjs-i18n
description: Run the CNCjs localization workflow, including string extraction, translation updates, and validation across frontend and server locales. Use when adding or changing user-facing text, refreshing translations, or checking translation completeness.
---

# CNCjs localization

## Scope and safety

- The scanner and frontend build language list is `build.config.js`; the
  Settings selector separately uses `src/app/constants/i18n.js`, and the server
  i18next whitelist is in `src/server/config/settings.base.js`. All three
  currently list `en`, `cs`, `de`, `es`, `fr`, `hu`, `it`, `ja`, `nb`, `nl`,
  `pt`, `pt-br`, `ru`, `tr`, `uk`, `zh-cn`, and `zh-tw`. Check each inventory
  when adding or removing a language.
- Frontend resources are in `src/app/i18n/<language>/`; server resources are in
  `src/server/i18n/<language>/`. Do not assume every configured namespace file
  exists: `src/server/i18n/uk/config.json` is currently absent.
- Frontend namespaces are `controller`, `gcode`, and `resource`; server
  namespaces are `config` and `resource`. The namespace lists live in
  `src/app/config/settings.js` and `src/server/config/settings.base.js`.
- The scanners write locale files and can remove unused keys. Inspect the
  working tree first and preserve pre-existing edits; do not run a scanner just
  to see whether JSON parses.
- Build commands also have side effects. `yarn dev` starts with `build-dev`,
  which clears `output/*`; `yarn build` invokes `build-prod`, which clears
  `dist/*`. These builds synchronize `src/package.json` and run both scanners.
  `build-latest` also clears `dist/*` and rewrites the version in
  `src/package.json`; `yarn win-dev` removes and recreates `output`. Inspect
  and preserve existing data and edits before running them; ask before deleting
  untracked or generated user data. Do not use a build merely to extract or
  validate translations.
- Compare with English and nearby usages before changing keys. Keep `{{...}}`
  interpolation tokens, punctuation, and meaning consistent. Do not invent
  translations when uncertain. Report untranslated or unverified entries
  explicitly.
- Do not replace locale keys with SHA-1 digests. `src/app/config/settings.js`
  hashes `gcode` and `resource` keys when loading, and `src/app/lib/i18n.js`
  hashes `i18n._` lookups; the JSON files intentionally keep readable English
  keys.

## Extract and translate

1. Use the existing call-site pattern: `i18n._('English text', { ... })` for
   frontend text, and `i18n.t('controller:Grbl.activeState.idle')` for explicit
   keys in the `controller` namespace. Pass `{ ns: 'gcode' }` for G-code labels,
   as in `src/app/lib/gcode-text.js`. The frontend scanner transform also
   recognizes `i18n.__`; explicit `i18n.t('controller:...')` keys are not
   scanner-managed. The server scanner recognizes `i18n.t` and `t`, as well as
   `i18n._` and `i18n.__` in its custom transform; for an existing server example,
   see `t('loading')` in `src/server/app.js`.
2. When source strings change, run the appropriate scanner from the project
   root. Pass explicit input globs: the server scanner config does not provide a
   default input. These commands correspond to those used by
   `scripts/build-dev.sh`, `scripts/build-prod.sh`, and `scripts/build-latest.sh`:

   ```sh
   yarn i18next-scanner --config i18next-scanner.app.config.js 'src/app/**/*.{html,js,jsx}' '!src/app/i18n/**' '!**/node_modules/**'
   yarn i18next-scanner --config i18next-scanner.server.config.js 'src/server/**/*.{html,js,jsx}' '!src/server/i18n/**' '!**/node_modules/**'
   ```

   `yarn build-dev`, `yarn build-prod`, and `yarn build-latest` also run these
   automatically; `yarn dev` starts with `build-dev`. Review the resulting diff
   rather than assuming it only added new keys.
3. Review generated changes. The frontend scanner uses the key as the English
   value and an empty value for other languages. The server scanner's configured
   default is `__L10N__`, but a nonempty call-site default can supply another
   value, including for multiple languages. Replace placeholders where
   translations are in scope. Do not overwrite existing translations without
   checking their context.
4. The app scanner covers the `gcode` and `resource` namespaces; the server
   scanner covers `resource`. Maintain `src/app/i18n/<language>/controller.json`
   and `src/server/i18n/<language>/config.json` manually. The frontend scanner
   removes unused keys from `resource` and retains unused keys in `gcode`; the
   server scanner removes unused keys from `resource`. Check usages before
   deleting any key manually.

## Validate

1. Run `yarn i18nlint` for JSON syntax. It runs `jsonlint -q` per file and does
   not check completeness, key parity, placeholder consistency, or translation
   quality.
2. Compare affected locale keys against English, including nested
   `controller.json` keys and plural or context variants. Check that
   interpolation tokens match and find empty strings or `__L10N__` in the
   changed scope. Distinguish pre-existing gaps from new ones.
3. Review translations in context and run the relevant Jest tests. For visible
   UI changes, verify the affected languages in the running application where
   practical; record any languages or checks not verified.
4. Inspect the full scanner diff for unrelated changes and preserve pre-existing
   edits. Report missing translations instead of treating valid JSON as
   completion.

## Completion

The changed call sites, English resources, and every affected locale are
consistent; placeholders and nested keys match; `yarn i18nlint` passes; relevant
tests pass or their absence is reported. State which languages and UI checks
were not verified.
