import { useState, useEffect } from 'react';

const useStateWithEffect = (initialState, callback) => {
  const [state, setState] = useState(initialState);

  useEffect(() => callback(state), [state, callback]);

  return [state, setState];
};

export default useStateWithEffect;
