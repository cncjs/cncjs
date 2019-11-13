import React, { Component } from 'react';
import uuid from 'uuid/v4';
import { ToastContext } from './context';

const noop = () => {};

class ToastManager extends Component {
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

    state = {
        toasts: [],
        addToast: this.addToast,
        removeToast: this.removeToast,
        clearToasts: this.clearToasts,
    };

    render() {
        const {
            context: Context = ToastContext,
            children,
        } = this.props;

        return (
            <Context.Provider value={this.state}>
                {children}
            </Context.Provider>
        );
    }
}

export default ToastManager;
