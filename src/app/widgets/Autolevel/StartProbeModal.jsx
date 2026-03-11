import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import { Checkbox } from 'app/components/Checkbox';
import Modal from 'app/components/Modal';
import { ToastNotification } from 'app/components/Notifications';
import { Button } from 'app/components/Buttons';
import i18n from 'app/lib/i18n';
import ProbeAreaDiagram from './ProbeAreaDiagram';
import ZProbeDiagram from './ZProbeDiagram';

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
    const { state, actions } = this.props;
    const {
      startX, startY, endX, endY, stepSize,
      clearanceZ, startZ, endZ, feedrate,
      units,
    } = state;
    const numPointsX = Math.floor((endX - startX) / stepSize) + 1;
    const numPointsY = Math.floor((endY - startY) / stepSize) + 1;
    const totalPoints = numPointsX * numPointsY;
    const { safetyConfirmed } = this.state;

    return (
      <Modal disableOverlay size="md" onClose={actions.closeModal}>
        <Modal.Header>
          <Modal.Title>
            {i18n._('Start Probing')}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ToastNotification
            type="warning"
            style={{ marginBottom: 16 }}
          >
            {i18n._('The Z-axis will descend until electrical contact is detected. If probe wires are not connected, the tool, workpiece, or machine may be damaged.')}
          </ToastNotification>
          <div className="form-group">
            {i18n._('You are about to probe your workpiece surface.')}
          </div>
          <div className="form-group">
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <ZProbeDiagram
                  clearanceZ={clearanceZ}
                  startZ={startZ}
                  endZ={endZ}
                  feedrate={feedrate}
                  units={units}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ textAlign: 'center', color: '#666', marginBottom: 4 }}>
                  {i18n._('{{count}} points', { count: totalPoints })}
                </div>
                <ProbeAreaDiagram
                  startX={startX}
                  startY={startY}
                  endX={endX}
                  endY={endY}
                  stepSize={stepSize}
                  units={units}
                />
              </div>
            </div>
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
            onClick={this.handleStartProbing}
            disabled={!safetyConfirmed}
          >
            {i18n._('Start Probing')}
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }
}

export default StartProbeModal;
