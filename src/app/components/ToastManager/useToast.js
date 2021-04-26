import { useContext } from 'react';
import { ToastContext } from './context';

const useToast = (options) => {
  const { context: Context = ToastContext } = { ...options };
  const context = useContext(Context);

  if (!context) {
    throw new Error('The `useToast` hook must be called from a descendent of the `ToastProvider`.');
  }

  return context;
};

export default useToast;
