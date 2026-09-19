import React from 'react';
import { Root } from './styles';

/**
 * Marks where the new UI begins.
 *
 * Nothing inside it inherits bootstrap's typography or box model; nothing
 * outside it is touched. Put one at the top of each migrated subtree.
 */
const Surface = ({ children }) => (
  <Root>
    {children}
  </Root>
);

export default Surface;
