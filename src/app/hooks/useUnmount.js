import useEffectOnce from './useEffectOnce';

const useUnmount = (fn) => {
    useEffectOnce(() => fn);
};

export default useUnmount;
