import chainedFunction from 'chained-function';
import React from 'react';
import api from 'app/api';
import { Button } from 'app/components/Buttons';
import Box from 'app/components/Box';
import Modal from 'app/components/Modal';
import Text from 'app/components/Text';
import controller from 'app/lib/controller';
import i18n from 'app/lib/i18n';
import log from 'app/lib/log';

const loadMacroById = async (id) => {
  try {
    let res;
    res = await api.macros.read(id);
    const { name } = res.body;
    controller.command('macro:load', id, controller.context, (err, data) => {
      if (err) {
        log.error(`Failed to load the macro: id=${id}, name="${name}"`);
        return;
      }

      log.debug(data); // TODO
    });
  } catch (err) {
    // Ignore error
  }
};

const LoadMacro = ({
  id,
  name,
  onClose,
}) => {
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
          onClick={chainedFunction(
            () => {
              loadMacroById(id);
            },
            onClose
          )}
        >
          {i18n._('Yes')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default LoadMacro;
