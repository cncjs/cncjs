import React from 'react';
import { WidgetConfigContext } from './context';

const WidgetConfigConsumer = ({
    context: Context = WidgetConfigContext,
    children,
}) => (
    <Context.Consumer>
        {config => ((typeof children === 'function') ? children(config) : children)}
    </Context.Consumer>
);

export default WidgetConfigConsumer;
