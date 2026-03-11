import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import { Checkbox } from 'app/components/Checkbox';
import Modal from 'app/components/Modal';
import { ToastNotification } from 'app/components/Notifications';
import i18n from 'app/lib/i18n';
import ZProbeDiagram from './ZProbeDiagram';

class TestProbeModal extends PureComponent {
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

  handleRunTestProbe = () => {
    this.props.actions.runTestProbe();
  };

  render() {
    const { state, actions } = this.props;
    const { clearanceHeight, probeStartZ, probeEndZ, probeFeedrate } = state;
    const { safetyConfirmed } = this.state;

    return (
      <Modal disableOverlay size="sm" onClose={actions.closeModal}>
        <Modal.Header>
          <Modal.Title>
            {i18n._('Run Test Probe')}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="form-group">
            <ToastNotification
              type="warning"
              style={{ marginBottom: 16 }}
            >
              {i18n._('The Z-axis will descend until electrical contact is detected. If probe wires are not connected, the tool, workpiece, or machine may be damaged.')}
            </ToastNotification>
          </div>
          <div className="form-group">
            {i18n._('A single probe test will be performed at the current XY position.')}
          </div>
          <div className="form-group" style={{ width: 320 }}>
            <ZProbeDiagram
              clearanceHeight={clearanceHeight}
              probeStartZ={probeStartZ}
              probeEndZ={probeEndZ}
              probeFeedrate={probeFeedrate}
            />
          </div>
          <Checkbox
            checked={safetyConfirmed}
            onChange={this.handleCheckboxChange}
          >
            {i18n._('I confirm probe wires are correctly connected')}
          </Checkbox>
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
            onClick={this.handleRunTestProbe}
            disabled={!safetyConfirmed}
          >
            {i18n._('Start')}
          </button>
        </Modal.Footer>
      </Modal>
    );
  }
}

export default TestProbeModal;
