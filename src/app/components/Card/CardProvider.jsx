import React from 'react';
import {
    DEFAULT_BORDER_COLOR,
    DEFAULT_BORDER_RADIUS,
    DEFAULT_BORDER_WIDTH,
    DEFAULT_SPACER_X,
    DEFAULT_SPACER_Y,
} from './constants';
import { CardContext } from './context';

const Provider = ({
    borderColor = DEFAULT_BORDER_COLOR,
    borderRadius = DEFAULT_BORDER_RADIUS,
    borderWidth = DEFAULT_BORDER_WIDTH,
    spacerX = DEFAULT_SPACER_X,
    spacerY = DEFAULT_SPACER_Y,
    children,
}) => {
    const value = {
        borderColor,
        borderRadius,
        borderWidth,
        spacerX,
        spacerY,
    };

    return (
        <CardContext.Provider value={value}>
            {children}
        </CardContext.Provider>
    );
};

export default Provider;
