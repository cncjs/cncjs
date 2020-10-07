import {
  TextLabel,
} from '@trendmicro/react-styled-ui';
import React from 'react';
import i18n from 'app/lib/i18n';
import { Button } from 'app/components/Buttons';
import Textarea from 'app/components/FormControl/Textarea';
import Modal from 'app/components/Modal';

const RunMacro = ({
  onClose,
  id,
  name,
  content,
}) => {
  const handleRunMacro = () => {
    // FIXME
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
          btnStyle="default"
          onClick={onClose}
        >
          {i18n._('Cancel')}
        </Button>
        <Button
          btnStyle="primary"
          onClick={handleRunMacro}
        >
          {i18n._('Run')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default RunMacro;
