import React from 'react';
import { ToastContext } from './context';

const ToastConsumer = ({ children }) => (
    <ToastContext.Consumer>
        {context => ((typeof children === 'function') ? children(context) : children)}
    </ToastContext.Consumer>
);

export default ToastConsumer;
