import { useCallback, useEffect, useState } from 'react';

const useAsync = (callback, dependencies = []) => {
  const [state, setState] = useState('idle');
  const [data, setData] = useState();
  const [error, setError] = useState();
  const callbackMemoized = useCallback(() => {
    setState('loading');
    setData(undefined);
    setError(undefined);
    callback()
      .then(setData)
      .catch(setError)
      .finally(() => {
        setState('idle');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callback, ...dependencies]);

  useEffect(() => {
    callbackMemoized();
  }, [callbackMemoized]);

  return { state, data, error };
};

export default useAsync;
