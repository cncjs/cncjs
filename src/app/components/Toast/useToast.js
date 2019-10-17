import { useContext } from 'react';
import { ToastContext } from './context';

const useToast = () => {
    const context = useContext(ToastContext);

    if (!context) {
        throw Error('The `useToast` hook must be called from a descendent of the `ToastProvider`.');
    }

    return {
        add: context.add,
        remove: context.remove,
        clear: context.clear,
        toasts: context.toasts,
    };
};

export default useToast;
