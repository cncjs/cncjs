import { WidgetEventContext } from './context';
import useWidgetEvent from './useWidgetEvent';

const WidgetEventConsumer = ({
  context: Context = WidgetEventContext,
  children,
}) => {
  const emitter = useWidgetEvent(Context);

  if (!emitter) {
    throw new Error('WidgetEventConsumer must be used within WidgetEventProvider');
  }

  return typeof children === 'function'
    ? children(emitter)
    : children;
};

export default WidgetEventConsumer;
