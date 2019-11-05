import produce from 'immer';
import _cloneDeep from 'lodash/cloneDeep';
import _isPlainObject from 'lodash/isPlainObject';
import _set from 'lodash/set';
import _unset from 'lodash/unset';
import _update from 'lodash/update';
import moize from 'moize';
import React, { useReducer } from 'react';
import log from 'app/lib/log';
import { WidgetConfigContext } from './context';

const enhancedReducer = (state, action) => {
    if (typeof action === 'function') {
        return {
            ...state,
            ...action(state),
        };
    }

    if (_isPlainObject(action)) {
        if (action.type === 'set') {
            const { path, value } = { ...action.payload };
            return produce(state, draft => {
                _set(draft, path, value);
            });
        }

        if (action.type === 'update') {
            const { path, updater } = { ...action.payload };
            return produce(state, draft => {
                _update(draft, path, updater);
            });
        }

        if (action.type === 'unset') {
            const { path } = { ...action.payload };
            return produce(state, draft => {
                _unset(draft, path);
            });
        }

        throw new Error(`Invalid action type specified: ${action.type}`);
    }

    return state;
};

const getMemoizedInitialState = moize.deep(({ config }) => {
    return _cloneDeep(config.get());
}, {
    maxSize: 1, // maximum size of cache for this method
});

const WidgetConfigProvider = ({
    context: Context = WidgetConfigContext,
    config,
    children,
}) => {
    const initialState = getMemoizedInitialState({ config });
    const [state, dispatch] = useReducer(enhancedReducer, initialState);

    log.trace(`WidgetConfigProvider: widgetId=${config.widgetId}`, state);

    return (
        <Context.Provider value={{ config, state, dispatch }}>
            {children}
        </Context.Provider>
    );
};

export default WidgetConfigProvider;
