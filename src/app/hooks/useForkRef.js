import { useMemo } from 'react';

function setRef(ref, value) {
  if (typeof ref === 'function') {
    ref(value);
  } else if (ref) {
    ref.current = value;
  }
}

const useForkRef = (refA, refB) => {
  /**
   * This will create a new function if the ref props change and are defined.
   * This means React will call the old forkRef with `null` and the new forkRef
   * with the ref. Cleanup naturally emerges from this behavior.
   */
  return useMemo(() => {
    if ((refA === null || refA === undefined) && (refB === null || refB === undefined)) {
      return null;
    }

    return (refValue) => {
      setRef(refA, refValue);
      setRef(refB, refValue);
    };
  }, [refA, refB]);
};

export default useForkRef;
