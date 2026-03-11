import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import { Checkbox } from 'app/components/Checkbox';
import Modal from 'app/components/Modal';
import { ToastNotification } from 'app/components/Notifications';
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
      clearanceHeight, probeStartZ, probeEndZ, probeFeedrate,
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
                  clearanceHeight={clearanceHeight}
                  probeStartZ={probeStartZ}
                  probeEndZ={probeEndZ}
                  probeFeedrate={probeFeedrate}
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
            {i18n._('Start')}
          </button>
        </Modal.Footer>
      </Modal>
    );
  }
}

export default StartProbeModal;
