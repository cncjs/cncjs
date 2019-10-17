import React from 'react';
import uuid from 'uuid/v4';
import { ToastContext } from './context';

const noop = () => {};

class ToastProvider extends React.Component {
    state = {
        toasts: [],
    };

    add = (meta, options, callback = noop) => {
        const id = uuid();

        this.setState(state => {
            const toasts = state.toasts.slice(0);
            const toast = {
                id,
                meta,
                options,
            };

            toasts.push(toast);

            return { toasts };
        }, () => callback(id));
    };

    remove = (id, callback = noop) => {
        this.setState(state => {
            const toasts = state.toasts.filter(toast => (toast.id !== id));

            return { toasts };
        }, () => callback(id));
    };

    clear = (callback = noop) => {
        this.setState(state => ({
            toasts: [],
        }), () => callback());
    };

    onDismiss = (id, callback = noop) => {
        callback(id);
        this.remove(id);
    };

    render() {
        const { children } = this.props;
        const { add, remove, clear } = this;
        const toasts = Object.freeze(this.state.toasts);

        return (
            <ToastContext.Provider value={{ add, remove, clear, toasts }}>
                {children}
            </ToastContext.Provider>
        );
    }
}

export default ToastProvider;
