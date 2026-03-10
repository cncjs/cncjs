import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Modal from 'app/components/Modal';
import i18n from 'app/lib/i18n';
import styles from './StartProbeModal.styl';

class StartProbeModal extends PureComponent {
  static propTypes = {
    state: PropTypes.object.isRequired,
    actions: PropTypes.object.isRequired,
  };

  state = {
    safetyConfirmed: false,
  };

  handleCheckboxChange = () => {
    this.setState({ safetyConfirmed: !this.state.safetyConfirmed });
  };

  handleStartProbing = () => {
    this.props.actions.startProbing();
  };

  render() {
    const { actions } = this.props;
    const { safetyConfirmed } = this.state;

    return (
      <Modal disableOverlay size="sm" onClose={actions.closeModal}>
        <Modal.Header>
          <Modal.Title>
            <span role="img" aria-label="Warning">⚠️</span> {i18n._('Confirm Surface Probe')}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>{i18n._('You are about to probe your workpiece surface.')}</p>

          <div className={styles.warningBox}>
            <div className={styles.warningTitle}>
              {i18n._('Critical Safety Warning')}
            </div>
            <div className={styles.warningContent}>
              <p>{i18n._('The Z-axis will descend until electrical contact is detected. If probe wires are not connected:')}</p>
              <ul>
                <li><span role="img" aria-label="Cross mark">❌</span> {i18n._('Tool or probe may break')}</li>
                <li><span role="img" aria-label="Cross mark">❌</span> {i18n._('Workpiece will be damaged')}</li>
                <li><span role="img" aria-label="Cross mark">❌</span> {i18n._('CNC machine may be damaged')}</li>
              </ul>
            </div>
          </div>

          <div style={{ marginTop: 15 }}>
            <label>
              <input
                type="checkbox"
                checked={safetyConfirmed}
                onChange={this.handleCheckboxChange}
              />
              {' '}
              {i18n._('I confirm probe wires are correctly connected')}
            </label>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <button
            type="button"
            className="btn btn-default"
            onClick={actions.closeModal}
          >
            {i18n._('Cancel')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={this.handleStartProbing}
            disabled={!safetyConfirmed}
          >
            {i18n._('Start Probing')}
          </button>
        </Modal.Footer>
      </Modal>
    );
  }
}

export default StartProbeModal;
