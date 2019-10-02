import useEffectOnce from './useEffectOnce';

const useMount = (fn) => {
    useEffectOnce(() => {
        fn();
    });
};

export default useMount;
