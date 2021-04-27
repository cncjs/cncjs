import {
  ensureArray,
  ensurePositiveFiniteNumber,
  ensureString,
} from 'ensure-type';
import memoize from 'micro-memoize';
import React, {
  useCallback,
  useRef,
  useState,
} from 'react';
import { ToastContext } from './context';

const initialState = {
  toasts: [],
};
const getMemoizedValue = memoize(value => ({ ...value }));

const ToastProvider = ({
  context: Context = ToastContext,
  children,
}) => {
  const idCounterRef = useRef(0);
  const [state, setState] = useState(initialState);

  const close = useCallback(id => {
    if (id === undefined || id === null) {
      return;
    }

    setState(prevState => {
      const toasts = ensureArray(prevState?.toasts);
      return {
        ...prevState,
        toasts: toasts.filter(toast => (toast.id !== id)),
      };
    });
  }, []);

  const closeAll = useCallback(() => {
    setState(initialState);
  }, []);

  /**
   * @param [options] The options object
   * @param [options.duration] Defaults to 0.
   * @param [options.position] Defaults to empty string.
   * @param [options.order] One of: 'auto', 'prepend', 'append'. Defaults to 'auto'.
   */
  const notify = useCallback((context, options) => {
    const id = ++idCounterRef.current;
    const duration = ensurePositiveFiniteNumber(options?.duration);
    const position = ensureString(options?.position) || '';
    const order = ensureString(options?.order) || 'auto';
    const toast = {
      id,
      context,
      duration,
      position,
      order,
      close: () => close(id),
    };
    setState(prevState => ({
      ...prevState,
      toasts: (() => {
        const toasts = ensureArray(prevState.toasts);
        if (order === 'prepend') {
          return [toast, ...toasts];
        }
        if (order === 'append') {
          return [...toasts, toast];
        }
        // prepend the toast for toasts positioned at the top of the screen, otherwise append it
        return position.includes('top')
          ? [toast, ...toasts]
          : [...toasts, toast];
      })(),
    }));
  }, [close]);

  const memoizedValue = getMemoizedValue({
    state,
    close,
    closeAll,
    notify,
  });

  return (
    <Context.Provider value={memoizedValue}>
      {children}
    </Context.Provider>
  );
};

export default ToastProvider;
