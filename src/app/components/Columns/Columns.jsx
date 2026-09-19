import React from 'react';
import { Root } from './styles';

/** Lays its children out in two equal columns. */
const Columns = ({ children }) => (
  <Root>
    {children}
  </Root>
);

export default Columns;
