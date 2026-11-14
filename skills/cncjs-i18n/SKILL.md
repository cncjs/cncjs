---
name: cncjs-i18n
description: Run the CNCjs localization workflow, including string extraction, translation updates, and validation across frontend and server locales. Use when adding or changing user-facing text, refreshing translations, or checking translation completeness.
---

# CNCjs localization

## Scope

Check the requested languages and affected namespaces first. `build.config.js` is
the language inventory. Frontend resources are in `src/app/i18n/<language>/`;
server resources are in `src/server/i18n/<language>/`. Compare with English and
nearby usages before changing keys. Keep interpolation tokens, punctuation, and
meaning consistent; do not invent translations when uncertain. Report untranslated
or unverified entries explicitly.

## Extract and translate

1. Use the existing `i18n._` / `i18n.__` patterns at the call site. Check the
   relevant scanner configuration for supported syntax and namespace behavior.
2. When source strings have changed, run the applicable scanner from the project
   root. These commands write locale files; inspect existing changes first.

   ```sh
   yarn i18next-scanner --config i18next-scanner.app.config.js 'src/app/**/*.{html,js,jsx}' '!src/app/i18n/**' '!**/node_modules/**'
   yarn i18next-scanner --config i18next-scanner.server.config.js 'src/server/**/*.{html,js,jsx}' '!src/server/i18n/**' '!**/node_modules/**'
   ```

3. Review generated changes. The frontend scanner uses the key as English and an
   empty value for other languages; the server scanner inserts `__L10N__` for new
   entries. Replace placeholders where translations are in scope. Do not overwrite
   existing translations without checking their context.
4. The scanners cover the namespaces listed in their configs, not every resource.
   For other files, including frontend `controller.json`, maintain the corresponding
   keys manually across the relevant locales. Scanners retain unused keys: check
   usages before removing any key.

## Validate

1. Run `yarn i18nlint` for JSON syntax. It does not check completeness, key parity,
   placeholder consistency, or translation quality.
2. Compare affected locale keys against English, including nested keys and plural or
   context variants. Check that interpolation tokens match and find empty strings or
   `__L10N__` in the changed scope. Distinguish pre-existing gaps from new ones.
3. Review translations in context, and run the relevant frontend or server tests.
   For visible UI changes, verify the affected languages in the running application
   where practical; record any languages or checks not verified.
4. Inspect the full scanner diff for unrelated changes and preserve pre-existing
   edits. Report missing translations instead of treating valid JSON as completion.
