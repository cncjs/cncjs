import {
  Button,
  Textarea,
  TextLabel,
} from '@trendmicro/react-styled-ui';
import React from 'react';
import Modal from 'app/components/Modal';
import controller from 'app/lib/controller';
import i18n from 'app/lib/i18n';
import log from 'app/lib/log';
import promisify from 'app/lib/promisify';

const x = JSON.stringify;

const controllerCommand = promisify(controller.command, {
  errorFirst: true,
  thisArg: controller
});

const runMacro = async ({ id }) => {
  const cmd = 'macro:run';

  try {
    const data = await controllerCommand(cmd, id, controller.context);
    log.debug(`controller.command(${x(cmd)}, ${x(id)}, controller.context): data=${x(data)}`);
  } catch (err) {
    log.error(`controller.command(${x(cmd)}, ${x(id)}, controller.context): err=${x(err)}`);
    // TODO: toast notification
  }
};

const RunMacro = ({
  onClose,
  id,
  name,
  content,
}) => {
  const handleRunMacro = async (e) => {
    await runMacro({ id });
    onClose();
  };

  return (
    <Modal size="md" onClose={onClose}>
      <Modal.Header>
        <Modal.Title>
          {i18n._('Run Macro')}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <TextLabel mb="2x">
          {name}
        </TextLabel>
        <Textarea
          readOnly
          rows={10}
          value={content}
        />
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="default"
          onClick={onClose}
        >
          {i18n._('Cancel')}
        </Button>
        <Button
          variant="primary"
          onClick={handleRunMacro}
        >
          {i18n._('Run')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default RunMacro;
