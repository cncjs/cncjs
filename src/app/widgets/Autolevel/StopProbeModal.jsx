import {
  Box,
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Space,
  Text,
} from '@tonic-ui/react';
import { StopIcon } from '@tonic-ui/react-icons';
import React, { useRef, useState } from 'react';
import i18n from '@app/lib/i18n';

/**
 * @param {{onCancel?: Function, onConfirm?: Function}} props
 */
function StopProbeModal({ onCancel = () => {}, onConfirm = () => {} }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLock = useRef(false);

  const submit = () => {
    if (submitLock.current) {
      return;
    }
    submitLock.current = true;
    setIsSubmitting(true);
    onConfirm();
  };

  return (
    <Modal
      closeOnInteractOutside={false} isClosable isOpen
      onClose={onCancel} size="sm"
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{i18n._('Stop Probing')}</ModalHeader>
        <ModalBody>
          <Box color="error.text">
            <Text mb="2x">{i18n._('Are you sure you want to stop probing?')}</Text>
            <Text>{i18n._('This will reset the controller and cancel the probe cycle.')}</Text>
          </Box>
        </ModalBody>
        <ModalFooter>
          <Button onClick={onCancel} variant="secondary">{i18n._('Continue Probing')}</Button>
          <Button disabled={isSubmitting} onClick={submit} variant="primary">
            <StopIcon aria-hidden="true" size="1em" />
            <Space width="1x" />
            {i18n._('Stop Probing')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default StopProbeModal;
