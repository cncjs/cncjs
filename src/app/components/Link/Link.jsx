import React from 'react';
import { Root } from './styles';

/**
 * A link out of the application.
 *
 * Remaining props go through to MUI's `Link`, so `href`, `target` and `rel`
 * behave as documented there.
 */
const Link = ({ children, ...props }) => (
  <Root {...props}>
    {children}
  </Root>
);

export default Link;
