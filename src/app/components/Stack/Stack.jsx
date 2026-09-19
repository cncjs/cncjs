import React from 'react';
import { Root } from './styles';

/** Stacks its children with the standard spacing between them. */
const Stack = ({ children }) => (
  <Root>
    {children}
  </Root>
);

export default Stack;
