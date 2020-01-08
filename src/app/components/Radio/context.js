import React from 'react';

export const RadioGroupContext = React.createContext({
    disabled: false,
    value: undefined,
    onChange: (e) => {},
});
