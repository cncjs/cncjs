import { WidgetEventContext } from './context';
import useWidgetEvent from './useWidgetEvent';

const WidgetEventConsumer = ({
    context: Context = WidgetEventContext,
    children,
}) => {
    const emitter = useWidgetEvent(Context);

    return typeof children === 'function'
        ? children(emitter)
        : children;
};

export default WidgetEventConsumer;
