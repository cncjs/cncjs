import {
  Box,
  Text,
} from '@tonic-ui/react';
import React from 'react';
import { Button } from '@app/components/Buttons';
import Modal from '@app/components/Modal';
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
  const cmd = 'macro:load';

  try {
    const data = await controllerCommand(cmd, id, controller.context);
    log.debug(`controller.command(${x(cmd)}, ${x(id)}, controller.context): data=${x(data)}`);
  } catch (err) {
    log.error(`controller.command(${x(cmd)}, ${x(id)}, controller.context): err=${x(err)}`);
    // TODO: toast notification
  }
};

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
    <Modal size="xs" onClose={onClose}>
      <Modal.Header>
        <Modal.Title>
          {i18n._('Load Macro')}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Text>
          {i18n._('Are you sure you want to load this macro?')}
        </Text>
        <Box my=".5rem">
          <Text fontWeight="semibold">
            {name}
          </Text>
        </Box>
      </Modal.Body>
      <Modal.Footer>
        <Button
          onClick={onClose}
        >
          {i18n._('No')}
        </Button>
        <Button
          btnStyle="primary"
          onClick={handleLoadMacro}
        >
          {i18n._('Yes')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default LoadMacro;
