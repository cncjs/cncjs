import React from 'react';
import { Column, Surface } from './styles';

/**
 * A whole screen in the new look: the surface, the baseline that scopes it,
 * and one centred column of content.
 *
 * Screens do not style themselves. This is what a container mounts so it can
 * stay free of both `@mui/material` and any styling of its own.
 */
const Screen = ({ children }) => (
  <Surface>
    <Column>
      {children}
    </Column>
  </Surface>
);

export default Screen;
