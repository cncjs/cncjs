# Project rules

## React component interfaces

* Document function component props using JSDoc.
* Do not add `propTypes`.
* Define runtime default values in function parameters. When removing `defaultProps`, preserve the existing default values.
* Do not use uncontrolled native form submission. Use `react-hook-form` with `FormControl` components: initialize with `useForm({ mode: 'onSubmit' })`, wrap the form in `FormProvider`, and read fields via `register`/`Controller` + `useFormContext`. Render the form as `<form noValidate onSubmit={form.handleSubmit(...)}>` and drive field error state from `formState.errors` (never the native `required` attribute).

## Tonic UI migration

- Use `Box` instead of native `<div>` elements in React code.
- Before using an unfamiliar Tonic component or prop, read the installed Tonic source or an existing local use.
- Widget modals must use `@tonic-ui/react` Modal and its supported props/composition. Use documented props such as `isOpen`, `onClose`, `size`, `isClosable`, `closeOnEsc`, and `closeOnInteractOutside`, with `ModalContent`, `ModalHeader`, `ModalBody`, and `ModalFooter`.
- Do not use legacy Modal props or APIs in Tonic Modal call sites, including `disableOverlay*`, `show`, and static Modal subcomponents.

## Runtime boundaries

- Use the narrowest `ensure-type` helper only at an untrusted boundary or where the contract requires normalization.
