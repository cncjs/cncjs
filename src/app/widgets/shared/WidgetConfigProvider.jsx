import React from 'react';
import { WidgetConfigContext } from './context';

const WidgetConfigProvider = ({
    context: Context = WidgetConfigContext,
    config,
    children,
}) => (
    <Context.Provider value={config}>
        {children}
    </Context.Provider>
);

export default WidgetConfigProvider;
