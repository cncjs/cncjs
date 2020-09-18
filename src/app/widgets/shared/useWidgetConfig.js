import _get from 'lodash/get';
import { useContext } from 'react';
import config from 'app/store/config';
import { WidgetConfigContext } from './context';
import { useTracked } from './tracked';
import { translatePathByWidgetId } from './utils';

const useWidgetConfig = (options) => {
  if (!useContext) {
    throw new Error('The useContext hook is not available with your React version');
  }

  const { context: Context = WidgetConfigContext } = { ...options };
  const widgetId = useContext(Context);
  const translatePath = translatePathByWidgetId(widgetId);
  const [state, dispatch] = useTracked();

  if (!widgetId) {
    throw new Error('useWidgetConfig must be called within WidgetConfigProvider');
  }

  return Object.freeze({
    get: (path, defaultValue) => _get(state, path, defaultValue),
    set: (path, value) => {
      dispatch({ type: 'set', payload: { path, value } });

      // TOOD: side effect
      config.set(translatePath(path), value);
    },
    unset: (path) => {
      dispatch({ type: 'unset', payload: { path } });

      // TODO: side effect
      config.unset(translatePath(path));
    },
    update: (path, updater) => {
      dispatch({ type: 'update', payload: { path, updater } });

      // TODO: side effect
      config.update(translatePath(path), updater);
    },
  });
};

export default useWidgetConfig;
