import produce from 'immer';
import _isEqual from 'lodash/isEqual';
import _isPlainObject from 'lodash/isPlainObject';
import _set from 'lodash/set';
import _unset from 'lodash/unset';
import _update from 'lodash/update';
import memoize from 'micro-memoize';
import React from 'react';
import config from '@app/store/config';
import { WidgetConfigContext } from './context';
import { Provider as TrackedProvider } from './tracked';

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

    if (action.type === 'unset') {
      const { path } = { ...action.payload };
      return produce(state, draft => {
        _unset(draft, path);
      });
    }

    if (action.type === 'update') {
      const { path, updater } = { ...action.payload };
      return produce(state, draft => {
        _update(draft, path, updater);
      });
    }

    throw new Error(`Invalid action type specified: ${action.type}`);
  }

  return state;
};

const getMemoizedInitialState = memoize(({ widgetId }) => {
  return config.get(['widgets', widgetId]);
}, {
  isEqual: _isEqual,
});

function WidgetConfigProvider({
  context: Context = WidgetConfigContext,
  widgetId,
  children,
}) {
  if (!widgetId) {
    throw new TypeError(`"widgetId" is not defined: ${widgetId}`);
  }

  const initialState = getMemoizedInitialState({ widgetId });

  return (
    <WidgetConfigContext.Provider value={widgetId}>
      <TrackedProvider reducer={enhancedReducer} initialState={initialState}>
        {children}
      </TrackedProvider>
    </WidgetConfigContext.Provider>
  );
}

export default WidgetConfigProvider;
