import React from 'react';
import {
    DEFAULT_BORDER_COLOR,
    DEFAULT_BORDER_RADIUS,
    DEFAULT_BORDER_WIDTH,
    DEFAULT_SPACER_X,
    DEFAULT_SPACER_Y,
} from './constants';

export const CardContext = React.createContext({
    borderColor: DEFAULT_BORDER_COLOR,
    borderRadius: DEFAULT_BORDER_RADIUS,
    borderWidth: DEFAULT_BORDER_WIDTH,
    spacerX: DEFAULT_SPACER_X,
    spacerY: DEFAULT_SPACER_Y,
});
