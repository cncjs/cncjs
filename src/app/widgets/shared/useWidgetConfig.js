import _get from 'lodash/get';
import { useContext } from 'react';
import config from 'app/store/config';
import { WidgetConfigContext } from './context';
import { useTracked } from './tracked';
import { translatePathByWidgetId } from './utils';

const useWidgetConfig = (options) => {
    const { context: Context = WidgetConfigContext } = { ...options };
    const widgetId = useContext(Context);
    const translatePath = translatePathByWidgetId(widgetId);
    const [state, dispatch] = useTracked();

    if (!widgetId) {
        throw Error('The `useWidgetConfig` hook must be called from a descendent of the `WidgetConfigProvider`.');
    }

    return Object.freeze({
        get: (path, defaultValue) => _get(state, path, defaultValue),
        set: (path, value) => {
            dispatch({ type: 'set', payload: { path, value } });
            config.set(translatePath(path), value);
        },
        unset: (path) => {
            dispatch({ type: 'unset', payload: { path } });
            config.unset(translatePath(path));
        },
        update: (path, updater) => {
            dispatch({ type: 'updater', payload: { path, updater } });
            config.update(translatePath(path), updater);
        },
    });
};

export default useWidgetConfig;
