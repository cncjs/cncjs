import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Modal from 'app/components/Modal';
import i18n from 'app/lib/i18n';

class ProbingSetup extends PureComponent {
  static propTypes = {
    state: PropTypes.object,
    actions: PropTypes.object
  };

  render() {
    const { state, actions } = this.props;
    const {
      startX,
      endX,
      stepX,
      startY,
      endY,
      stepY,
      feedXY,
      feedZ,
      depth,
      height,
      canClick,
    } = state;

    const displayUnits = i18n._('mm');
    const step = 1;

    // Calculate number of probe points
    const numPointsX = Math.floor((endX - startX) / stepX) + 1;
    const numPointsY = Math.floor((endY - startY) / stepY) + 1;
    const totalPoints = numPointsX * numPointsY;

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
                    placeholder="0"
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
                    placeholder="100"
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
                    placeholder="0"
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
                    placeholder="100"
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
                    placeholder="10"
                    min={1}
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
                    placeholder="10"
                    min={1}
                    step={step}
                    onChange={actions.handleStepYChange}
                  />
                  <span className="input-group-addon">{displayUnits}</span>
                </div>
              </div>
            </div>
            <div className="col-xs-6" style={{ paddingRight: 5 }}>
              <div className="form-group">
                <label className="control-label">{i18n._('Feedrate XY')}</label>
                <div className="input-group input-group-sm">
                  <input
                    type="number"
                    className="form-control"
                    value={feedXY}
                    placeholder="1000"
                    min={1}
                    step={100}
                    onChange={actions.handleFeedXYChange}
                  />
                  <div className="input-group-addon">{i18n._('mm/min')}</div>
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
                    placeholder="100"
                    min={1}
                    step={10}
                    onChange={actions.handleFeedZChange}
                  />
                  <span className="input-group-addon">{i18n._('mm/min')}</span>
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
                    placeholder="-5"
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
                    placeholder="5"
                    min={0}
                    step={step}
                    onChange={actions.handleHeightChange}
                  />
                  <span className="input-group-addon">{displayUnits}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="row no-gutters" style={{ marginTop: 10 }}>
            <div className="col-xs-12">
              <div style={{ fontSize: 12, color: '#666' }}>
                {i18n._('Total probe points')}: <strong>{totalPoints}</strong> ({numPointsX} x {numPointsY})
              </div>
            </div>
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
            className="btn btn-default"
            onClick={() => {
              actions.saveProbingGcode();
              actions.closeModal();
            }}
          >
            {i18n._('Save G-code')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              actions.runProbing();
              actions.closeModal();
            }}
            disabled={!canClick}
          >
            {i18n._('Run Probing')}
          </button>
        </Modal.Footer>
      </Modal>
    );
  }
}

export default ProbingSetup;
