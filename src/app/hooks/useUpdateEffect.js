/* eslint consistent-return: 0 */
import { useEffect, useRef } from 'react';

const useUpdateEffect = (effect, dependencies) => {
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (typeof effect === 'function') {
      return effect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
};

export default useUpdateEffect;
