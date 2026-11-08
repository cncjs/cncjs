# React Hook Form migration

Date: 2026-10-08. Status: **completed (2026-10-09)** — Waves 0–3 and the final acceptance gates pass. Owner: root session.

## Problem

1. **UX bug (reported):** Administration Add/Edit drawers show a red "invalid" border the moment the drawer opens (New Command: `name` + `action` both red before any input). On Edit, the red flashes during the data load, then disappears once values arrive.

2. **Root cause (verified in Tonic source):** Tonic's `_invalid` pseudo-variant compiles to **both `&:invalid` and `&[aria-invalid=true]`** (`node_modules/@tonic-ui/styled-system/dist/esm/pseudo.js`), and the base `Input`/`FormInput`/`FormTextarea` style always includes the `_invalid` (red border) rule. The shared `FieldInput`/`FieldTextarea` pass `required={required}` straight onto the native `<input>`/`<textarea>`. An empty `required` input matches native `:invalid` → red, **independently of react-final-form's `meta.submitFailed` gate** (which only controls `aria-invalid` + the error text). This is why the red shows on open and flashes during edit-load.

3. **Decision (user-directed):** Migrate all form usage from `react-final-form` to `react-hook-form` (v7, ~40k GitHub stars). This also fixes the bug as a consequence (see Design).

## Environment

- React `18.3.1`. Package manager: **Yarn 3.3.1 (Berry)**, `nodeLinker: node-modules`, lockfile `yarn.lock`.
- `react-hook-form@7.89.0` is installed. `react-final-form` and `final-form` have been removed from package.json, yarn.lock, and installed package resolution.

## Original inventory (25 `react-final-form` importers + 3 `final-form` core importers)

All share one idiom: `<Form initialValues onSubmit validate subscription render/children>` wrapping `<Field name {validate} {type} {subscription}>` render-prop children that spread `{...input}`.

| Cluster | Count | Files |
|---|---|---|
| Shared field components | 3 (+1 label) | `FieldInput`, `FieldTextarea`, `FieldErrorText` (+ `FieldTextLabel`, no RFF) |
| Admin create drawer | 5 | `CreateCommandDrawer`, `CreateEventDrawer`, `CreateMachineDrawer`, `CreateMacroDrawer`, `CreateUserDrawer` |
| Admin update drawer (query hydrate) | 5 | `UpdateCommandDrawer`, `UpdateEventDrawer`, `UpdateMachineDrawer`, `UpdateMacroDrawer`, `UpdateUserDrawer` |
| Admin non-drawer | 1 | `GeneralSettings` |
| Login | 1 | `LoginPage` |
| Widget confirm modal (safety checkbox) | 2 | `Autolevel/StartProbeModal`, `Autolevel/TestProbeModal` |
| Widget config modal (`FORM_ERROR`/`FormSpy`) | 3 | `Custom/modals/SettingsModal`, `Macro/modals/EditMacro`, `Macro/modals/NewMacro` |
| Widget inline standalone form | 3 | `Probe/Probe`, `Tool`, `Connection` (1210 lines) |
| Widget modal (simple config submit) | 2 | `Probe/modals/ProbeModal`, `Webcam/modals/SettingsModal` |

Support libs (no RFF import, reused as-is where compatible): `pages/Administration/validations.js`, `widgets/shared/validations.js`, `pages/Administration/Machines/limits.js`.

## Design

### Validation-timing contract (the fix)

- Every form uses `useForm({ mode: 'onSubmit' })` (RHF default) + `progressive: false` (RHF default). With `progressive` off, `register(name, { required })` adds **no native attribute** → no `:invalid` → **no premature red**.
- Red border is driven **only** by `aria-invalid` (Tonic `_invalid` = `:invalid` OR `[aria-invalid=true]`), and we set `aria-invalid` **only when `formState.errors[name]` exists**, which under `mode:'onSubmit'` is only after a submit attempt. So: no red on open / no edit-load flash; red appears after the user presses Add/Save and a rule fails.
- We stop forwarding the `required` prop as a native attribute. `required` now means: (a) the `FormLabel` asterisk, (b) the RHF `required` validation rule, (c) `aria-required`. Never the native `required` attribute.
- Reuse existing validators directly: `validations.required(v)` and `composeValidators(...)` already return `undefined`-or-message, which is exactly RHF's `validate` return contract. `validatePortNumber(1,65535)` is curried to `(v)=>…`. So `register(name, { validate: v => required(v) })` and `register(name, { validate: composeValidators(required, minValue(0)) })` work unchanged.

### RFF → RHF API map

| RFF | RHF |
|---|---|
| `Form initialValues` | `useForm({ defaultValues })` |
| `Form onSubmit` | `methods.handleSubmit(onSubmit)` on `<form>` |
| `Form validate` (form-level fn) | per-field `register(name, { validate })`; cross-field via `validate: (v, values) => …` |
| `Form subscription` | `formState` / `useWatch` |
| `Field` render-prop `{input, meta}` + `{...input}` | `register(name, rules)` for native inputs; `<Controller>` for Switch/Checkbox/Radio/ButtonGroup/Dropdown/Autocomplete |
| `meta.submitFailed && meta.error` | `!!formState.errors[name]` (populated only after submit) |
| `meta.error && meta.touched` | `formState.errors[name] && formState.touchedFields[name]` |
| `form.change(name, value)` | `setValue(name, value, { shouldValidate: true })` |
| `form.submit()` | `methods.handleSubmit(onSubmit)()` (programmatic) |
| `FormSpy subscription={{values}}` | `useWatch({ control, name })` / `watch` |
| `FormSpy subscription={{invalid}}` | explicit gate from watched values; preserve the existing domain gate rather than substituting `formState.isValid` |
| `FORM_ERROR` (final-form core) | `setError('root', { type, message })` / read `formState.errors.root?.message` |
| `keepDirtyOnReinitialize` (Tool) | `useForm({ resetOptions: { keepDirtyValues: true } })` + `reset` on external value change |

### Shared field component contract (rewrite these 3)

Wrap every form in `<FormProvider {...methods}>` so field components read the form via `useFormContext()` (no render-prop, no prop-drilling). Rewrite to be framework-driven:

- `FieldInput({ name, label, required, infoTipLabel, labelAction, validate, ...rest })`: `const { register, formState } = useFormContext();` `const error = formState.errors[name]?.message;` → `<FormControl error={!!error}> <FormLabel required> … <FormInput {...register(name, { required, validate })} aria-required={required || undefined} aria-invalid={!!error || undefined} …/> {error && <Icon/>} <FormErrorMessage errors={error ? [error] : []}/> </FormControl>`. **No `required` on the native input.**
- `FieldTextarea`: same with `FormTextarea`.
- `FieldErrorText({ name })`: `const { formState } = useFormContext();` render the error `Text` only when `formState.errors[name]?.message`.
- `FieldTextLabel`: unchanged (no form logic).

### Per-cluster notes

- **Admin create drawers:** `useForm({ defaultValues, mode:'onSubmit' })`; move form-level `validate` into `register` rules; `enabled` Switch → `Controller`; `form.submit()` → `methods.handleSubmit(onSubmit)()`.
- **Admin update drawers:** add `useEffect(() => { if (query.data) methods.reset(mapToForm(query.data)); }, [query.data])` to replace the memoized-`initialValues` re-hydration; gate submit button on `query.isError||query.isFetching||mutation.isLoading` (unchanged).
- **GeneralSettings:** `useForm` + `useEffect` reset on `query.isSuccess`; two checkbox Fields → `Controller`; validate is a no-op (keep).
- **LoginPage:** field-level `validate` (trim-required); error UI gated on `formState.errors[name] && formState.touchedFields[name]`. Keep initial blur neutral under submit-only validation; retain touched-field error display after failed submission.
- **Autolevel probe modals:** `safetyConfirmed` checkbox → `Controller`; `subscription={{values}}` → `useWatch`; button gate from watched value.
- **`FORM_ERROR` modals (Custom, EditMacro, NewMacro):** async submission catches failures and calls `setError('root', { type: 'server', message: e.message })`; footer reads `formState.errors.root?.message`. Do not rethrow: the former `FORM_ERROR` return displayed a failure without rejecting the event handler. Drop `FORM_ERROR`/`FormSpy`/`final-form` imports.
- **ProbeModal / Webcam SettingsModal:** config-driven `register`/`Controller`; `form.submit()` → `methods.handleSubmit(...)`; radios → `Controller`; Dropdown → `register`.
- **Probe.jsx:** number fields use `register(..., { validate: composeValidators(required, minValue(0)) })`; forward changes through the registered handler and preserve metric `config.set` side effects. Keep the button gate from watched values.
- **Tool.jsx:** `useForm({ resetOptions: { keepDirtyValues: true } })`; external `value` → `reset(value, { keepDirtyValues:true })` in effect; `FormSpy onChange(values)` → `watch`/`setValue` reporting; `form.change('toolProbeCustomCommands',…)` → `setValue`.
- **Connection.jsx (riskiest, 1210 lines):** `useForm({ defaultValues, mode:'onSubmit' })`; every field → `register`/`Controller` with existing `config.set` side effects in `setValue`; socket host/port → `register(..., { validate })`; `FormSpy` → `useWatch`; `canOpenConnection` computed from watched values (do NOT gate on `isValid`). Preserve the memoized initial-values identity to avoid config-churn.

## Dependency + rule changes

- `yarn add react-hook-form` added `^7.89.0` (installed `7.89.0`). The old dependencies were retained until all consumers were migrated, then removed with `yarn remove react-final-form final-form`. No matches remain in src/app, package.json, or yarn.lock; neither retired package resolves.
- **RULES.md:** change "Use `react-final-form` with `FormControl` components instead" → "Use `react-hook-form` with `FormControl` components instead", and clarify that `<form onSubmit={form.handleSubmit(…)} noValidate>` is the sanctioned pattern (not forbidden "native form submission").

## Waves + verification

1. **Wave 0 — foundation (root, inline): DONE.** install RHF (keep RFF — see dependency note), update RULES.md, rewrite `FieldInput`/`FieldTextarea`/`FieldErrorText` to `useFormContext`. Verify: `yarn` resolves; read RHF source to confirm `progressive` default + that `required` rule adds no native attribute; focused lint.
2. **Wave 1 — Administration (the reported bug): DONE.** All 10 admin drawers + GeneralSettings migrated. Focused tests, lint, and browser Command drawer validation/loading checks pass.
3. **Wave 2 — login + simple widget modals: DONE.** LoginPage, Autolevel ×2, ProbeModal, Webcam SettingsModal, Custom SettingsModal, NewMacro, and EditMacro migrated. Focused tests, lint, and browser login/safety-modal checks pass.
4. **Wave 3 — complex inline forms: DONE.** Probe.jsx, Tool.jsx, and Connection.jsx migrated. Focused tests, lint, and browser Tool keyboard-save/socket validation checks pass.
5. **Final gate: DONE.** Full frontend: 80 suites / 515 tests pass. Full lint exits 0 (13 ESLint warnings, 28 Stylint warnings; zero errors). Zero retired form dependency matches or installed resolution. UI migration: zero violations; 68 contract tests pass.

## Progress

- **Wave 0 — foundation: complete (2026-10-08).** Installed `react-hook-form@7.89.0` (package.json + lockfile + node_modules consistent; RFF kept). RULES.md mandates react-hook-form for forms. Rewrote `FieldInput`/`FieldTextarea`/`FieldErrorText` to `useFormContext()` — framework-driven, no render-prop; the `{...register(name, …)}` spread also fixes the latent RFF bug where Tonic's FormInput/FormTextarea `onChange` swallowed the injected `input.onChange` (values never updated). Verified from RHF source: `mode` default `'onSubmit'`, `progressive` default `false` (required rule adds no native `required`).
- **Wave 1 — Administration: implemented and reviewed.** All ten drawers and GeneralSettings use RHF. Luna extra-high and Sol medium reviewed the migration. Root fixed DrawerContent form composition, GeneralSettings column flex/scroll layout, machine minimum-to-maximum validation dependencies, and macro insertion revalidation after a failed submit. Shared fields now display message-less errors and reserve textarea error-icon space. Mutation fixtures retain stable identities; the incidental toast-hook render-count assertion was removed, while toast count and payload assertions remain.
- **Current focused verification:** FieldValidation 2/2, CommandDrawers 2/2, InlineToastsMigration 25/25, and GeneralSettings 2/2 pass. Targeted Administration ESLint passes. A browser harness rendered the real Command drawers with query/mutation fixtures: New Command had neutral borders on open, red borders after failed Add, and correct right-edge placement; delayed Edit loaded saved values without native or RHF invalid state. GeneralSettings retained a pinned footer while its overflowing body scrolled in a 240px container. This is component-surface evidence, not a full authenticated application run.
- **Historical full regression:** 79 suites / 509 tests passed before the review fixes. Final integration found nine assertions that ran before RHF submission completed; the workflow and Custom Settings tests now await the observable transition or saved value. Probe start/stop ordering uses a controlled clock to isolate the existing delayed setup visualization.
- **Wave 3 verification:** Probe, Tool, and Connection focused checks pass (4 suites / 31 tests). Tool now has a dirty-field/external-reset regression; its keyboard test uses an actual changed command rather than saving its original value. Browser component surfaces proved Tool keyboard commits, invalid socket port errors only after Open, no connection request on invalid submit, and the complete valid socket payload. Probe forwards the registered onChange handler to retain submit-only validation.
- **Login implementation and verification:** RHF provider/form/register migration complete. A synchronous pending ref preserves duplicate-submission protection. Login and Probe focused checks pass (2 suites / 12 tests); targeted ESLint passes. The browser login surface remained neutral after initial blur, blocked empty keyboard submission with linked errors, and retained the draft after a fixture authentication failure.
- **Wave 2 — modals: complete.** Autolevel safety forms, ProbeModal, Webcam SettingsModal, Custom SettingsModal, and NewMacro/EditMacro use RHF. Modal/login checks pass (6 suites / 43 tests), including config-write failures, linked validation, and pending-submission protection. The browser safety surface confirmed Start Probing stays disabled until confirmation, with no native required constraint.
- **Final acceptance (2026-10-09):** `yarn test:frontend --runInBand --silent`: 80 suites / 515 tests pass. The final workflow helper also passes its four focused tests. `yarn lint` exits 0 with zero errors (13 ESLint warnings and 28 Stylint warnings remain). Retired packages have no source/manifest/lockfile matches and cannot resolve. `yarn check:ui-migration`: 358 files / 18 domain classes / zero violations. `yarn test:ui-migration`: 68 tests pass. Browser evidence is limited to real component surfaces with fixture boundaries, not a full authenticated application run.


## Risks

- Preserve explicit watched-value action gates; do not replace them with RHF `formState.isValid`, which has different validation timing.
- Config-syncing fields (Connection, Tool) must not create feedback loops when mapping `reset`/`setValue` + `config.set`.
- `reset` on query hydrate must not stomp user edits (use `keepDirtyValues` where the original used `keepDirtyOnReinitialize`).
- Touched-gated error UI remains neutral on initial blur under submit-only validation and shows touched-field errors after failed submission.

## Not in scope

- No changes to `src/server/**`, reducers, sagas, actions.
- No new schema library (`@hookform/resolvers`) — validations stay hand-rolled (already RHF-compatible).
