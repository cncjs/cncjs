import { useContext } from 'react';
import { ModalActionContext } from './ModalContext';

const useModal = (initialState = false) => {
    const context = useContext(ModalActionContext);
    if (!context) {
        throw Error('The `useModal` hook must be called from a descendent of the `ModalProvider`.');
    }

    const { openModal, closeModal } = context;

    return { openModal, closeModal };
};

export default useModal;
