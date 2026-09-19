import React from 'react';
import { Root } from './styles';

/**
 * The application's button. Nothing else defines one.
 *
 * Every remaining prop goes through to MUI, so `type`, `disabled`, `onClick`
 * and `fullWidth` behave as they are documented there.
 */
const Button = ({ children, ...props }) => (
  <Root variant="contained" disableElevation {...props}>
    {children}
  </Root>
);

export default Button;
