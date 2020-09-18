import React from 'react';
import {
  DEFAULT_BORDER_COLOR,
  DEFAULT_BORDER_RADIUS,
  DEFAULT_BORDER_WIDTH,
  DEFAULT_SPACING_X,
  DEFAULT_SPACING_Y,
} from './constants';

export const CardContext = React.createContext({
  borderColor: DEFAULT_BORDER_COLOR,
  borderRadius: DEFAULT_BORDER_RADIUS,
  borderWidth: DEFAULT_BORDER_WIDTH,
  spacingX: DEFAULT_SPACING_X,
  spacingY: DEFAULT_SPACING_Y,
});
