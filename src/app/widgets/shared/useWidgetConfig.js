import { useContext } from 'react';
import { WidgetConfigContext } from './context';

const useWidgetConfig = (options) => {
    const { context: Context = WidgetConfigContext } = { ...options };
    const config = useContext(Context);

    if (!config) {
        throw Error('The `useWidgetConfig` hook must be called from a descendent of the `WidgetConfigProvider`.');
    }

    return config;
};

export default useWidgetConfig;
