import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Modal from 'app/components/Modal';
import ModalTemplate from 'app/components/ModalTemplate';
import { Button } from 'app/components/Buttons';
import i18n from 'app/lib/i18n';

class StopProbeModal extends PureComponent {
  static propTypes = {
    actions: PropTypes.object.isRequired,
  };

  render() {
    const { actions } = this.props;

    return (
      <Modal disableOverlay size="sm" onClose={actions.closeModal}>
        <Modal.Header>
          <Modal.Title>
            {i18n._('Stop Probing')}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ModalTemplate type="warning">
            <p>{i18n._('Are you sure you want to stop probing?')}</p>
            <p>{i18n._('This will reset the controller and cancel the probe cycle.')}</p>
          </ModalTemplate>
        </Modal.Body>
        <Modal.Footer>
          <Button
            btnStyle="flat"
            onClick={actions.closeModal}
          >
            {i18n._('Continue Probing')}
          </Button>
          <Button
            btnStyle="danger"
            onClick={actions.stopProbing}
          >
            <i className="fa fa-stop" /> {i18n._('Stop Probing')}
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }
}

export default StopProbeModal;
