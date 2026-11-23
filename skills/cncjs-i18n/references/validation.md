# Validate CNCjs locales

Paths and commands here are relative to the repository root. A
completeness-only request is read-only: report findings, without editing files,
running scanners, or building.

## Determine scope from the checkout

- Read `build.config.js` for scanner and frontend build languages,
  `src/app/constants/i18n.js` for the Settings selector, and
  `src/server/config/settings.base.js` for the server language whitelist.
  Check all three when adding or removing a language.
- Read `src/app/config/settings.js` and `src/server/config/settings.base.js`
  for the respective namespace settings. Inspect the actual files in
  `src/app/i18n/<language>/` and `src/server/i18n/<language>/`; do not assume
  a configured namespace file exists for every language.

## Recommended translation workflow

Follow the Localization and Translation Validation sections in `CONTRIBUTING.md`
for CNCjs-specific guidance.

1. Identify the target language, app or server namespace, and keys in scope.
   Use the English resource, its call site, and nearby translations for context.
   If a string changed in source, follow the entry's extraction route first.
2. For translation-only work, update the target locale JSON directly without
   running a scanner. Preserve existing key names, nesting, and interpolation
   tokens, and use established terms for that locale. If asked to complete a
   translation, add missing English-defined keys or namespace files as needed,
   using verified translations. Leave uncertain text untranslated and flag it
   for review. For a completeness-only audit, report gaps without editing.
3. Review the diff and run the syntax and completeness checks below. For a
   frontend preview, use an isolated CNCjs instance when available. Refresh
   after applying the translated resources to that preview, with the browser
   cache disabled in DevTools as recommended by `CONTRIBUTING.md`. Do not
   overwrite the user's installed resources for verification.
4. If asked to prepare a contribution, summarize the locales changed and the
   checks performed. Use `cncjs-pr` for the draft; committing, pushing, or
   opening a PR requires separate authorization.

## Check syntax and completeness separately

1. Use `yarn i18nlint` for JSON syntax. It runs `jsonlint -q` per file; it does
   not check completeness, key parity, interpolation, or translation quality.
2. Compare affected locale keys with English. Include nested keys (for
   example in `controller.json`), applicable plural and context forms, and
   matching `{{...}}` interpolation tokens. Check for missing files or keys,
   empty strings, and `__L10N__`. Separate pre-existing gaps from new ones.
3. Review meaning and punctuation in context. For translation updates, retain
   valid translations and report untranslated entries instead of guessing.
4. For visible changes, run relevant tests and inspect the affected languages
   in the application when safe. Do not start the user's normal server or
   use hardware. Report which languages, UI behavior, and tests were not
   verified; valid JSON is not proof of complete localization.
