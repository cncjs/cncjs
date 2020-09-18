import React from 'react';
import { ToastContext } from './context';

const ToastRenderer = ({
  context: Context = ToastContext,
  children,
}) => (
  <Context.Consumer>
    {context => ((typeof children === 'function') ? children(context) : children)}
  </Context.Consumer>
);

export default ToastRenderer;
