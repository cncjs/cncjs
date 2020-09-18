import { useContext } from 'react';
import { WidgetEventContext } from './context';

const useWidgetEvent = (options) => {
  if (!useContext) {
    throw new Error('The useContext hook is not available with your React version');
  }

  const { context: Context = WidgetEventContext } = { ...options };
  const emitter = useContext(Context);

  if (!emitter) {
    throw new Error('useWidgetEvent must be called within WidgetEventProvider');
  }

  return emitter;
};

export default useWidgetEvent;
