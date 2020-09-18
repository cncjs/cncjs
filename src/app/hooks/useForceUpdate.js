import { useState, useCallback } from 'react';

const useForceUpdate = () => {
  const [, setState] = useState(false);
  // useCallback with empty dependencies as we only want to define updateCallback once
  const updateCallback = useCallback(() => setState(val => !val), []);
  return updateCallback;
};

export default useForceUpdate;
