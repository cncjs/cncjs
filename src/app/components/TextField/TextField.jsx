import React from 'react';
import { Field, Input, Label } from './styles';

/**
 * A labelled text input.
 *
 * `id` is required rather than generated, because the label is associated
 * through it: that is what lets assistive technology — and the end-to-end
 * suite — find the field by its name rather than by its position.
 *
 * Remaining props go through to MUI's `InputBase`, so `type`, `inputRef`,
 * `autoComplete` and `autoFocus` behave as documented there.
 */
const TextField = ({ id, label, ...props }) => (
  <Field fullWidth>
    <Label htmlFor={id}>{label}</Label>
    <Input id={id} {...props} />
  </Field>
);

export default TextField;
