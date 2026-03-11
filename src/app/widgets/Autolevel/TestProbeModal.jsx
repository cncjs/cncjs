import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import { Checkbox } from 'app/components/Checkbox';
import Modal from 'app/components/Modal';
import { ToastNotification } from 'app/components/Notifications';
import { Button } from 'app/components/Buttons';
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

  handleStartTestProbe = () => {
    this.props.actions.startTestProbe();
  };

  render() {
    const { state, actions } = this.props;
    const { clearanceZ, startZ, endZ, feedrate, units } = state;
    const { safetyConfirmed } = this.state;

    return (
      <Modal disableOverlay size="sm" onClose={actions.closeModal}>
        <Modal.Header>
          <Modal.Title>
            {i18n._('Test Probe')}
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
              clearanceZ={clearanceZ}
              startZ={startZ}
              endZ={endZ}
              feedrate={feedrate}
              units={units}
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
          <Button
            btnStyle="default"
            onClick={actions.closeModal}
          >
            {i18n._('Cancel')}
          </Button>
          <Button
            btnStyle="primary"
            onClick={this.handleStartTestProbe}
            disabled={!safetyConfirmed}
          >
            {i18n._('Start Test Probe')}
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }
}

export default TestProbeModal;
