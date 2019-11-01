import events from 'events';
import React, { useRef } from 'react';
import { WidgetEventContext } from './context';

const WidgetEventEmitter = ({
    context: Context = WidgetEventContext,
    children,
}) => {
    const emitterRef = useRef(new events.EventEmitter());

    return (
        <Context.Provider value={emitterRef.current}>
            {typeof children === 'function' ? children(emitterRef.current) : children}
        </Context.Provider>
    );
};

export default WidgetEventEmitter;
