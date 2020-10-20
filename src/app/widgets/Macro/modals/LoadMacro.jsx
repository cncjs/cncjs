import {
  Box,
  Text,
} from '@trendmicro/react-styled-ui';
import chainedFunction from 'chained-function';
import React from 'react';
import axios from 'app/api/axios';
import { Button } from 'app/components/Buttons';
import Modal from 'app/components/Modal';
import controller from 'app/lib/controller';
import i18n from 'app/lib/i18n';
import log from 'app/lib/log';

const loadMacroById = async (id) => {
  try {
    const url = `/macros/${id}`;
    const response = await axios.get(url);
    const { name } = { ...response.data };
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
