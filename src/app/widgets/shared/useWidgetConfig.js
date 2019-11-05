import _get from 'lodash/get';
import { useContext } from 'react';
import { WidgetConfigContext } from './context';

const useWidgetConfig = (options) => {
    const { context: Context = WidgetConfigContext } = { ...options };
    const { config, state, dispatch } = useContext(Context);

    if (!state || !dispatch) {
        throw Error('The `useWidgetConfig` hook must be called from a descendent of the `WidgetConfigProvider`.');
    }

    return {
        get: (path, defaultValue) => _get(state, path, defaultValue),
        set: (path, value) => {
            dispatch({ type: 'set', payload: { path, value } });
            config.set(path, value);
        },
        unset: (path, value) => {
            dispatch({ type: 'unset', payload: { path } });
            config.unset(path, value);
        },
    };
};

export default useWidgetConfig;
