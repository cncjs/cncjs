/* eslint consistent-return: 0 */
import ensureArray from 'ensure-array';
import { useEffect, useRef } from 'react';

const useUpdateEffect = (effect, deps) => {
    const isInitialMount = useRef(true);
    deps = ensureArray(deps);
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        if (typeof effect === 'function') {
            return effect();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
};

export default useUpdateEffect;
