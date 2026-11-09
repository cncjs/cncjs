import {
  Alert,
  Box,
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalOverlay,
  Text,
} from '@tonic-ui/react';
import React from 'react';
import controller from '@app/lib/controller';
import i18n from '@app/lib/i18n';

/**
 * @param {{ message?: string, onClose?: () => void, title?: string }} props
 * @returns {JSX.Element}
 */
function FeederWait({ title = '', message = '', onClose = () => {} }) {
  const stop = () => {
    controller.command('feeder_stop');
    onClose();
  };

  return (
    <Modal
      autoFocus
      closeOnEsc={false}
      closeOnInteractOutside={false}
      ensureFocus
      isClosable={false}
      isOpen
      onClose={onClose}
      size="xs"
    >
      <ModalOverlay />
      <ModalContent>
        <ModalBody>
          <Alert severity="warning">
            <Box fontWeight="bold">
              <Text as="h5">{title}</Text>
              {message && <Text as="p">{message}</Text>}
            </Box>
            <Box>{i18n._('Waiting for the planner to empty...')}</Box>
          </Alert>
        </ModalBody>
        <ModalFooter>
          <Button onClick={stop} variant="danger">
            {i18n._('Stop')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default FeederWait;
