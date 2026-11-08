import {
  Box,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Text,
} from '@tonic-ui/react';
import React, { useRef, useState } from 'react';
import i18n from '@app/lib/i18n';

function ConfirmDeleteMacro({
  onClose,
  name,
  onConfirm,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const submitLockRef = useRef(false);

  const handleClose = () => {
    if (submitLockRef.current) {
      return;
    }
    onClose();
  };

  const handleConfirm = async () => {
    if (submitLockRef.current) {
      return;
    }
    submitLockRef.current = true;
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      submitLockRef.current = false;
      setError(err.message || i18n._('An unexpected error has occurred.'));
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      closeOnEsc
      closeOnInteractOutside
      isClosable={!isSubmitting}
      isOpen
      onClose={handleClose}
      size="sm"
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          {i18n._('Delete Macro')}
        </ModalHeader>
        <ModalBody>
          <Box mb="4x">
            {i18n._('Are you sure you want to delete this macro?')}
          </Box>
          <Text fontWeight="semibold">
            {name}
          </Text>
          {error && (
            <Text color="error.text" mt="2x">
              {error}
            </Text>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            variant="default"
            disabled={isSubmitting}
            onClick={handleClose}
          >
            {i18n._('Cancel')}
          </Button>
          <Button
            variant="emphasis"
            disabled={isSubmitting}
            onClick={handleConfirm}
          >
            {i18n._('Delete')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default ConfirmDeleteMacro;
