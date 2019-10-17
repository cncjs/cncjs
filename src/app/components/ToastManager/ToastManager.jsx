import React, { Component } from 'react';
import uuid from 'uuid/v4';
import { ToastContext } from './context';

const noop = () => {};

class ToastManager extends Component {
    state = {
        toasts: [],
    };

    addToast = (meta, options, callback = noop) => {
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

    removeToast = (id, callback = noop) => {
        this.setState(state => {
            const toasts = state.toasts.filter(toast => (toast.id !== id));

            return { toasts };
        }, () => callback(id));
    };

    clearToasts = (callback = noop) => {
        this.setState(state => ({
            toasts: [],
        }), () => callback());
    };

    onDismiss = (id, callback = noop) => {
        callback(id);
        this.remove(id);
    };

    render() {
        const {
            context: Context = ToastContext,
            children,
        } = this.props;
        const { addToast, removeToast, clearToasts } = this;
        const toasts = Object.freeze(this.state.toasts);

        return (
            <Context.Provider value={{ addToast, removeToast, clearToasts, toasts }}>
                {children}
            </Context.Provider>
        );
    }
}

export default ToastManager;
