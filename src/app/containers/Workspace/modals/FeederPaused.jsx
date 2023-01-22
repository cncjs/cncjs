import chainedFunction from 'chained-function';
import PropTypes from 'prop-types';
import React from 'react';
import { Button } from 'app/components/Buttons';
import ModalTemplate from 'app/components/ModalTemplate';
import Modal from 'app/components/Modal';
import controller from 'app/lib/controller';
import i18n from 'app/lib/i18n';

const FeederPaused = ({
  title,
  message,
  onClose,
}) => (
  <Modal
    size="xs"
    disableOverlay={true}
    showCloseButton={false}
  >
    <Modal.Body>
      <ModalTemplate type="warning">
        <h5>{title}</h5>
        {message &&
          <p>{message}</p>
        }
        <p>{i18n._('Click the Continue button to resume execution.')}</p>
      </ModalTemplate>
    </Modal.Body>
    <Modal.Footer>
      <Button
        className="pull-left"
        btnStyle="danger"
        onClick={chainedFunction(
          () => {
            controller.command('feeder:stop');
          },
          onClose
        )}
      >
        {i18n._('Stop')}
      </Button>
      <Button
        onClick={chainedFunction(
          () => {
            controller.command('feeder:start');
          },
          onClose
        )}
      >
        {i18n._('Continue')}
      </Button>
    </Modal.Footer>
  </Modal>
);

FeederPaused.propTypes = {
  title: PropTypes.string,
  message: PropTypes.string,
  onClose: PropTypes.func
};

export default FeederPaused;
