import { useEffect } from 'react';

const useEffectOnce = (effect) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(effect, []);
};

export default useEffectOnce;
