import React from 'react';
import { Field, HelperText, Input, Label } from './styles';

/**
 * A labelled text input.
 *
 * `id` is required rather than generated, because the label is associated
 * through it: that is what lets assistive technology — and the end-to-end
 * suite — find the field by its name rather than by its position.
 *
 * `error` is not only a red border. It sets `aria-invalid`, and `helperText`
 * is wired to the field through `aria-describedby`, so the rejection reaches a
 * screen reader as well as an eye. Colour alone would say nothing to either.
 *
 * Remaining props go through to MUI's `InputBase`, so `type`, `inputRef`,
 * `autoComplete` and `autoFocus` behave as documented there.
 */
const TextField = ({ id, label, error, helperText, ...props }) => {
  const helperTextId = helperText ? `${id}-helper-text` : undefined;

  return (
    <Field fullWidth error={!!error}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        error={!!error}
        inputProps={{
          'aria-invalid': error ? 'true' : undefined,
          'aria-describedby': helperTextId,
        }}
        {...props}
      />
      {helperText && (
        <HelperText id={helperTextId} error={!!error}>
          {helperText}
        </HelperText>
      )}
    </Field>
  );
};

export default TextField;
