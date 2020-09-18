import ensureArray from 'ensure-array';
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
  useEffect(callback, useDeepCompareMemoize(dependencies));
};

export default useDeepCompareEffect;
