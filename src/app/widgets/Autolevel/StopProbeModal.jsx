import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Modal from 'app/components/Modal';
import { Button } from 'app/components/Buttons';
import i18n from 'app/lib/i18n';
import styles from './StartProbeModal.styl';

class StopProbeModal extends PureComponent {
  static propTypes = {
    state: PropTypes.object.isRequired,
    actions: PropTypes.object.isRequired,
  };

  render() {
    const { actions, state } = this.props;
    const { probeProgress } = state;
    const { current = 0, total = 0 } = probeProgress || {};

    return (
      <Modal disableOverlay size="sm" onClose={actions.closeModal}>
        <Modal.Header>
          <Modal.Title>
            <span role="img" aria-label="Warning">⚠️</span> {i18n._('Stop Probing?')}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>{i18n._('Are you sure you want to stop probing?')}</p>

          <div className={styles.warningBox}>
            <div className={styles.warningContent}>
              <p>{i18n._('Progress: {{current}}/{{total}} points completed', { current, total })}</p>
              <p>{i18n._('Stopping probing will:')}</p>
              <ul>
                <li>{i18n._('Halt all remaining probe operations')}</li>
                <li>{i18n._('Keep the data from completed points')}</li>
                <li>{i18n._('Allow you to save partial probe data')}</li>
              </ul>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button
            btnStyle="default"
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
