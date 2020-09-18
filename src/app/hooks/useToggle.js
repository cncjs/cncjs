import { useCallback, useState } from 'react';

const useToggle = (initialState = false) => {
  const [state, setState] = useState(initialState);
  const toggle = useCallback(nextState => {
    setState(state => ((nextState !== undefined) ? !!nextState : !state));
  }, []);

  return [state, toggle];
};

export default useToggle;
