/* eslint consistent-return: 0 */
import { useEffect, useRef } from 'react';

const useUpdateEffect = (effect, deps) => {
    const isInitialMount = useRef(true);

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        return effect();
    }, deps);
};

export default useUpdateEffect;
