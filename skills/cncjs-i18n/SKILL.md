---
name: cncjs-i18n
description: Run the CNCjs localization workflow, including string extraction, translation updates, and validation across frontend and server locales. Use when adding or changing user-facing text, refreshing translations, or checking translation completeness.
---

# CNCjs localization

Source paths are repository-relative; reference links are skill-relative.

## Baseline and authorization

- Read the English text and nearby usages first. Keep meaning, punctuation,
  and `{{...}}` interpolation consistent. Do not invent translations.
- Keep human-readable keys in locale files. Frontend `gcode` and `resource`
  keys are hashed at runtime, not in the JSON files.
- Check the working tree and preserve existing edits. Scanners rewrite locale
  files and can delete keys; builds can overwrite manifests and delete
  outputs. Never run scanners or builds simply to validate translations.
- Do not start the user's normal server or use hardware for verification.

## Route by task

Read only the references for the requested work, before editing or checking.

| When the task involves | Read |
| --- | --- |
| Adding or changing a string in source | [Extraction](references/extraction.md) and [Validation](references/validation.md) |
| Translation-only updates or completeness checks | [Validation](references/validation.md) |
| Adding or removing a supported language | [Extraction](references/extraction.md) and [Validation](references/validation.md) |

## Completion

- Check affected locale keys and placeholders against English, and check that
  changed call sites agree with their resources.
- Report JSON syntax checks and applicable tests or actual UI evidence.
- Report untranslated entries, pre-existing gaps, and any languages or
  behaviors not verified. A completeness audit does not authorize edits.
