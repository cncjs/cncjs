// import includes from 'lodash/includes';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Modal from 'app/components/Modal';
import i18n from 'app/lib/i18n';
// import log from '../../lib/log';

class MakeProbeFile extends PureComponent {
  static propTypes = {
    state: PropTypes.object,
    actions: PropTypes.object
  };

  render() {
    const { state, actions } = this.props;
    const { startX, endX, startY, endY, stepX, stepY, feedXY, feedZ, depth, height } = state;
    const { canClick } = state;
    // log.info('MakeProbeFile render:' + JSON.stringify(state));
    const displayUnits = i18n._('mm');
    const step = 1;

    return (
      <Modal disableOverlay size="sm" onClose={actions.closeModal}>
        <Modal.Header>
          <Modal.Title>{i18n._('Probing Setup')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="row no-gutters">
            <div className="col-xs-6" style={{ paddingRight: 5 }}>
              <div className="form-group">
                <label className="control-label">{i18n._('Start X')}</label>
                <div className="input-group input-group-sm">
                  <input
                    type="number"
                    className="form-control"
                    value={startX}
                    placeholder="0.00"
                    min={-200}
                    step={step}
                    onChange={actions.handleStartXChange}
                  />
                  <div className="input-group-addon">{displayUnits}</div>
                </div>
              </div>
            </div>
            <div className="col-xs-6" style={{ paddingLeft: 5 }}>
              <div className="form-group">
                <label className="control-label">{i18n._('End X')}</label>
                <div className="input-group input-group-sm">
                  <input
                    type="number"
                    className="form-control"
                    value={endX}
                    placeholder="0.00"
                    min={0}
                    step={step}
                    onChange={actions.handleEndXChange}
                  />
                  <span className="input-group-addon">{displayUnits}</span>
                </div>
              </div>
            </div>
            <div className="col-xs-6" style={{ paddingRight: 5 }}>
              <div className="form-group">
                <label className="control-label">{i18n._('Start Y')}</label>
                <div className="input-group input-group-sm">
                  <input
                    type="number"
                    className="form-control"
                    value={startY}
                    placeholder="0.00"
                    min={-200}
                    step={step}
                    onChange={actions.handleStartYChange}
                  />
                  <div className="input-group-addon">{displayUnits}</div>
                </div>
              </div>
            </div>
            <div className="col-xs-6" style={{ paddingLeft: 5 }}>
              <div className="form-group">
                <label className="control-label">{i18n._('End Y')}</label>
                <div className="input-group input-group-sm">
                  <input
                    type="number"
                    className="form-control"
                    value={endY}
                    placeholder="0.00"
                    min={0}
                    step={step}
                    onChange={actions.handleEndYChange}
                  />
                  <span className="input-group-addon">{displayUnits}</span>
                </div>
              </div>
            </div>
            <div className="col-xs-6" style={{ paddingRight: 5 }}>
              <div className="form-group">
                <label className="control-label">{i18n._('Step X')}</label>
                <div className="input-group input-group-sm">
                  <input
                    type="number"
                    className="form-control"
                    value={stepX}
                    placeholder="0.00"
                    min={0}
                    step={step}
                    onChange={actions.handleStepXChange}
                  />
                  <div className="input-group-addon">{displayUnits}</div>
                </div>
              </div>
            </div>
            <div className="col-xs-6" style={{ paddingLeft: 5 }}>
              <div className="form-group">
                <label className="control-label">{i18n._('Step Y')}</label>
                <div className="input-group input-group-sm">
                  <input
                    type="number"
                    className="form-control"
                    value={stepY}
                    placeholder="0.00"
                    min={0}
                    step={step}
                    onChange={actions.handleStepYChange}
                  />
                  <span className="input-group-addon">{displayUnits}</span>
                </div>
              </div>
            </div>
            <div className="col-xs-6" style={{ paddingRight: 5 }}>
              <div className="form-group">
                <label className="control-label">{i18n._('Feedrate X-Y')}</label>
                <div className="input-group input-group-sm">
                  <input
                    type="number"
                    className="form-control"
                    value={feedXY}
                    placeholder="0.00"
                    min={0}
                    step={step}
                    onChange={actions.handleFeedXYChange}
                  />
                  <div className="input-group-addon">{displayUnits}</div>
                </div>
              </div>
            </div>
            <div className="col-xs-6" style={{ paddingLeft: 5 }}>
              <div className="form-group">
                <label className="control-label">{i18n._('Feedrate Z')}</label>
                <div className="input-group input-group-sm">
                  <input
                    type="number"
                    className="form-control"
                    value={feedZ}
                    placeholder="0.00"
                    min={0}
                    step={step}
                    onChange={actions.handleFeedZChange}
                  />
                  <span className="input-group-addon">{displayUnits}</span>
                </div>
              </div>
            </div>
            <div className="col-xs-6" style={{ paddingRight: 5 }}>
              <div className="form-group">
                <label className="control-label">{i18n._('Probe Depth')}</label>
                <div className="input-group input-group-sm">
                  <input
                    type="number"
                    className="form-control"
                    value={depth}
                    placeholder="0.00"
                    min={0}
                    step={step}
                    onChange={actions.handleDepthChange}
                  />
                  <div className="input-group-addon">{displayUnits}</div>
                </div>
              </div>
            </div>
            <div className="col-xs-6" style={{ paddingLeft: 5 }}>
              <div className="form-group">
                <label className="control-label">{i18n._('Safe Height')}</label>
                <div className="input-group input-group-sm">
                  <input
                    type="number"
                    className="form-control"
                    value={height}
                    placeholder="0.00"
                    min={0}
                    step={step}
                    onChange={actions.handleHeightChange}
                  />
                  <span className="input-group-addon">{displayUnits}</span>
                </div>
              </div>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <button
            type="button"
            className="btn btn-default"
            onClick={() => {
              actions.closeModal();
              actions.simulateProbing();
            }}
          >
            {i18n._('Simulate')}
          </button>
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
            onClick={() => {
              actions.closeModal();
              actions.loadProbingGcode('hello');
            }}
            disabled={!canClick}
          >
            {i18n._('Upload G-Code')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              actions.closeModal();
              actions.saveProbingGcode('hello');
            }}
          >
            {i18n._('Make File')}
          </button>
        </Modal.Footer>
      </Modal>
    );
  }
}

export default MakeProbeFile;
