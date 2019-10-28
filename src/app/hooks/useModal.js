import { useCallback, useState } from 'react';

const useModal = (initialState = false) => {
    const [state, setState] = useState(initialState);
    const toggle = useCallback(nextState => {
        setState(state => ((nextState !== undefined) ? !!nextState : !state));
    }, []);
    const isModalOpen = !!state;
    const openModal = () => toggle(true);
    const closeModal = () => toggle(false);
    const toggleModal = toggle;

    return { isModalOpen, openModal, closeModal, toggleModal };
};

export default useModal;
