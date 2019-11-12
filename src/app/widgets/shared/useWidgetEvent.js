import { useContext } from 'react';
import { WidgetEventContext } from './context';

const useWidgetEvent = (options) => {
    const { context: Context = WidgetEventContext } = { ...options };
    const emitter = useContext(Context);

    if (!emitter) {
        throw new Error('The `useWidgetEvent` hook must be called from a descendent of the `WidgetEventProvider`.');
    }

    return emitter;
};

export default useWidgetEvent;
