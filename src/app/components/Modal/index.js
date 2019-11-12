import Modal from './Modal';
import Overlay from './ModalOverlay';
import Content from './ModalContent';
import Header from './ModalHeader';
import Title from './ModalTitle';
import Body from './ModalBody';
import Footer from './ModalFooter';
import { ModalProvider, ModalConsumer } from './ModalContext';
import ModalRoot from './ModalRoot';
import useModal from './useModal';

Modal.Overlay = Overlay;
Modal.Content = Content;
Modal.Header = Header;
Modal.Title = Title;
Modal.Body = Body;
Modal.Footer = Footer;

export {
    ModalProvider,
    ModalConsumer,
    ModalRoot,
    useModal,
};

export default Modal;
