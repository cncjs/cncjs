import { useEffect, useRef } from 'react';

const usePrevious = (value, defaultValue) => {
  const ref = useRef(defaultValue);

  useEffect(() => {
    ref.current = value;
  });

  return ref.current;
};

export default usePrevious;
