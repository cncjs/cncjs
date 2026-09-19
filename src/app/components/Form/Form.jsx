import React from 'react';
import { Root } from './styles';

/**
 * A stack of form controls with the standard rhythm between them.
 *
 * Being a real `<form>` with a real submit button is what makes the Enter key
 * work, which is how anyone signs in from a keyboard. `onSubmit` is expected
 * to call `preventDefault`.
 */
const Form = ({ onSubmit, children }) => (
  <Root onSubmit={onSubmit}>
    {children}
  </Root>
);

export default Form;
