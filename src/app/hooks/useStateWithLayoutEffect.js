import { useState, useLayoutEffect } from 'react';

const useStateWithLayoutEffect = (initialState, callback) => {
  const [state, setState] = useState(initialState);

  useLayoutEffect(() => callback(state), [state, callback]);

  return [state, setState];
};

export default useStateWithLayoutEffect;
