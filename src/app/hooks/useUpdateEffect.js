/* eslint consistent-return: 0 */
import { useEffect, useRef } from 'react';

const useUpdateEffect = (effect, deps) => {
    const isInitialMount = useRef(true);
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
