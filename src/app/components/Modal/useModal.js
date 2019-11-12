import { useContext } from 'react';
import { ModalContext } from './ModalContext';

const useModal = (initialState = false) => {
    const { modals, openModal, closeModal } = useContext(ModalContext);

    return { modals, openModal, closeModal };
};

export default useModal;
