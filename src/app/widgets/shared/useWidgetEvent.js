import { useContext } from 'react';
import { WidgetEventContext } from './context';

const useWidgetEvent = (options) => {
    const { context: Context = WidgetEventContext } = { ...options };
    const emitter = useContext(Context);

    if (!emitter) {
        throw Error('The `useWidgetEvent` hook must be called from a descendent of the `WidgetConfigEmitter`.');
    }

    return emitter;
};

export default useWidgetEvent;
