import { useContext } from 'react';
import { ModalActionContext } from './ModalContext';

const useModal = (initialState = false) => {
    if (!useContext) {
        throw new Error('The `useContext` hook is not available with your React version.');
    }

    const context = useContext(ModalActionContext);
    if (!context) {
        throw new Error('The `useModal` hook must be called from a descendent of the `ModalProvider`.');
    }

    const { openModal, closeModal } = context;

    return { openModal, closeModal };
};

export default useModal;
