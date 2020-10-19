import { ensureArray } from 'ensure-type';
import _isEqual from 'lodash/isEqual';
import { useEffect, useRef } from 'react';

const useDeepCompareMemoize = (value) => {
  const ref = useRef();

  if (!_isEqual(value, ref.current)) {
    ref.current = value;
  }

  return ref.current;
};

const useDeepCompareEffect = (callback, dependencies) => {
  dependencies = ensureArray(dependencies);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(callback, useDeepCompareMemoize(dependencies));
};

export default useDeepCompareEffect;
