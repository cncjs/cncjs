import {
  Box,
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
} from '@tonic-ui/react';
import React from 'react';
import controller from '@app/lib/controller';
import i18n from '@app/lib/i18n';
import x from '@app/lib/json-stringify';
import log from '@app/lib/log';
import promisify from '@app/lib/promisify';

const controllerCommand = promisify(controller.command, {
  errorFirst: true,
  thisArg: controller
});

const loadMacro = async ({ id }) => {
  const cmd = 'macro_load';

  try {
    const data = await controllerCommand(cmd, id, controller.context);
    log.debug(`controller.command(${x(cmd)}, ${x(id)}, controller.context): data=${x(data)}`);
  } catch (err) {
    log.error(`controller.command(${x(cmd)}, ${x(id)}, controller.context): err=${x(err)}`);
    // TODO: toast notification
  }
};

/**
 * @param {{id: string, name: string, onClose: () => void}} props
 * @returns {JSX.Element}
 */
function LoadMacro({
  id,
  name,
  onClose,
}) {
  const handleLoadMacro = async (e) => {
    await loadMacro({ id });
    onClose();
  };

  return (
    <Modal
      closeOnInteractOutside
      isClosable
      isOpen
      onClose={onClose}
      size="xs"
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{i18n._('Load Macro')}</ModalHeader>
        <ModalBody>
          <Text>
            {i18n._('Are you sure you want to load this macro?')}
          </Text>
          <Box my=".5rem">
            <Text fontWeight="semibold">
              {name}
            </Text>
          </Box>
        </ModalBody>
        <ModalFooter>
          <Button
            onClick={onClose}
          >
            {i18n._('No')}
          </Button>
          <Button
            variant="primary"
            onClick={handleLoadMacro}
          >
            {i18n._('Yes')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default LoadMacro;
