import { useEffect, useRef } from 'react';

const useUpdateEffect = (effect, dependencies) => {
  const firstRenderRef = useRef(true);

  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }

    if (typeof effect === 'function') {
      // eslint-disable-next-line consistent-return
      return effect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
};

export default useUpdateEffect;
