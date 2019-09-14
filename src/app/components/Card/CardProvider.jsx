import React from 'react';
import {
    DEFAULT_SPACER_X,
    DEFAULT_SPACER_Y,
} from './constants';
import { CardContext } from './context';

const Provider = ({
    borderColor,
    borderRadius,
    borderWidth,
    spacerX = DEFAULT_SPACER_X, // need to specify the default value
    spacerY = DEFAULT_SPACER_Y, // need to specify the default value
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
