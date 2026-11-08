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
function FeederPaused({ title = '', message = '', onClose = () => {} }) {
  const stop = () => {
    controller.command('feeder_stop');
    onClose();
  };
  const resume = () => {
    controller.command('feeder_start');
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
            <Box>{i18n._('Click the Continue button to resume execution.')}</Box>
          </Alert>
        </ModalBody>
        <ModalFooter justify="space-between">
          <Button onClick={stop} variant="danger">
            {i18n._('Stop')}
          </Button>
          <Button onClick={resume}>
            {i18n._('Continue')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default FeederPaused;
