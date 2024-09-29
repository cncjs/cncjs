import { ensurePositiveInteger } from 'ensure-type';
import { useCallback, useMemo, useState } from 'react';

const uniqueId = (() => {
  let id = 0;
  return () => {
    id += 1;
    return String(id);
  };
})();

const useInlineToasts = (options) => {
  const maxToasts = ensurePositiveInteger(options?.maxToasts);
  const [toasts, setToasts] = useState([]);

  const notify = useCallback((options) => {
    const {
      appearance,
      content,
      duration = null,
      isClosable = true,
    } = { ...options };

    setToasts(prevState => {
      const id = uniqueId();
      const onClose = () => {
        setToasts(toasts => toasts.filter(x => x.id !== id));
      };
      // You can decide how many toasts you want to show at the same time depending on your use case
      const nextState = [
        ...prevState.slice(maxToasts > 1 ? -(maxToasts - 1) : prevState.length),
        {
          id,
          appearance,
          content,
          duration,
          isClosable,
          onClose,
        },
      ];
      return nextState;
    });
  }, [maxToasts]);

  const dismiss = useCallback(() => {
    setToasts([]);
  }, []);

  const context = useMemo(() => ({
    toasts,
    notify,
    dismiss,
  }), [toasts, notify, dismiss]);

  return context;
};

export default useInlineToasts;
