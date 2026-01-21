import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Modal from 'app/components/Modal';
import api from 'app/api';
import pubsub from 'pubsub-js';
import i18n from 'app/lib/i18n';
import log from 'app/lib/log';
import controller from 'app/lib/controller';

class ApplyAutoLevel extends PureComponent {
  static propTypes = {
    state: PropTypes.object,
    actions: PropTypes.object
  };

  state = {
    gcodeFileName: '',
    gcode: '',
    isApplying: false,
    isUploading: false,
  };

  fileInputEl = null;

  handleFileSelect = (event) => {
    const files = event.target.files;
    const file = files[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      this.setState({
        gcodeFileName: file.name,
        gcode: e.target.result,
      });
    };
    reader.onerror = (e) => {
      log.error('Error reading file:', e);
    };
    reader.readAsText(file);
  };

  handleApply = () => {
    const { state } = this.props;
    const { gcode } = this.state;
    const { probingData, stepX, stepY, port } = state;

    if (!gcode || probingData.length < 3) {
      log.error('Cannot apply: no G-code loaded or insufficient probing data');
      return;
    }

    this.setState({ isApplying: true });

    // Send to server for Z compensation
    controller.command('autolevel:apply', {
      gcode,
      probingData,
      stepX,
      stepY,
    }, (err, result) => {
      this.setState({ isApplying: false });

      if (err) {
        log.error('Error applying auto-level:', err);
        return;
      }

      const { compensatedGcode } = result;

      // Load the compensated G-code
      const name = `AL_${this.state.gcodeFileName}`;
      api.loadGCode({ port, name, gcode: compensatedGcode })
        .then((res) => {
          const { name: loadedName = '', gcode: loadedGcode = '' } = { ...res.body };
          pubsub.publish('gcode:load', { name: loadedName, gcode: loadedGcode });
          this.props.actions.closeModal();
        })
        .catch((res) => {
          log.error('Failed to load compensated G-code');
        });
    });
  };

  handleSave = () => {
    const { state } = this.props;
    const { gcode, gcodeFileName } = this.state;
    const { probingData, stepX, stepY } = state;

    if (!gcode || probingData.length < 3) {
      log.error('Cannot apply: no G-code loaded or insufficient probing data');
      return;
    }

    this.setState({ isApplying: true });

    // Send to server for Z compensation
    controller.command('autolevel:apply', {
      gcode,
      probingData,
      stepX,
      stepY,
    }, (err, result) => {
      this.setState({ isApplying: false });

      if (err) {
        log.error('Error applying auto-level:', err);
        return;
      }

      const { compensatedGcode } = result;

      // Download the compensated G-code
      const blob = new Blob([compensatedGcode], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AL_${gcodeFileName}`;
      a.click();
      URL.revokeObjectURL(url);

      this.props.actions.closeModal();
    });
  };

  render() {
    const { state, actions } = this.props;
    const { probingData, canClick } = state;
    const { gcodeFileName, gcode, isApplying } = this.state;

    const hasGcode = gcode.length > 0;
    const hasProbingData = probingData && probingData.length >= 3;
    const canApply = hasGcode && hasProbingData && canClick && !isApplying;

    // Calculate bounding box of probing data
    let probeBbox = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    if (hasProbingData) {
      const xValues = probingData.map(p => p.x);
      const yValues = probingData.map(p => p.y);
      probeBbox = {
        minX: Math.min(...xValues),
        maxX: Math.max(...xValues),
        minY: Math.min(...yValues),
        maxY: Math.max(...yValues),
      };
    }

    return (
      <Modal disableOverlay size="sm" onClose={actions.closeModal}>
        <Modal.Header>
          <Modal.Title>{i18n._('Apply AutoLevel')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="form-group">
            <label className="control-label">{i18n._('Probing Data')}</label>
            <div style={{ padding: '8px', backgroundColor: '#f5f5f5', borderRadius: 4, fontSize: 12 }}>
              {hasProbingData ? (
                <div>
                  <div><strong>{probingData.length}</strong> {i18n._('points')}</div>
                  <div>
                    X: {probeBbox.minX.toFixed(1)} ~ {probeBbox.maxX.toFixed(1)} mm
                  </div>
                  <div>
                    Y: {probeBbox.minY.toFixed(1)} ~ {probeBbox.maxY.toFixed(1)} mm
                  </div>
                </div>
              ) : (
                <div style={{ color: '#999' }}>
                  {i18n._('No probing data available. Run probing first.')}
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="control-label">{i18n._('G-code File')}</label>
            <div>
              <input
                ref={(el) => {
                  this.fileInputEl = el;
                }}
                type="file"
                accept=".nc,.ngc,.gcode,.txt"
                style={{ display: 'none' }}
                onChange={this.handleFileSelect}
              />
              <button
                type="button"
                className="btn btn-default btn-sm"
                onClick={() => this.fileInputEl && this.fileInputEl.click()}
              >
                {i18n._('Select File')}
              </button>
              {gcodeFileName && (
                <span style={{ marginLeft: 10, fontSize: 12 }}>
                  {gcodeFileName}
                </span>
              )}
            </div>
          </div>

          {hasGcode && (
            <div className="form-group">
              <label className="control-label">{i18n._('G-code Preview')}</label>
              <textarea
                className="form-control"
                rows={5}
                readOnly
                value={gcode.substring(0, 1000) + (gcode.length > 1000 ? '\n...' : '')}
                style={{ fontSize: 11, fontFamily: 'monospace' }}
              />
              <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                {gcode.split('\n').length} {i18n._('lines')}
              </div>
            </div>
          )}
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
            onClick={this.handleSave}
            disabled={!canApply}
          >
            {isApplying ? i18n._('Processing...') : i18n._('Save File')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={this.handleApply}
            disabled={!canApply}
          >
            {isApplying ? i18n._('Processing...') : i18n._('Apply & Load')}
          </button>
        </Modal.Footer>
      </Modal>
    );
  }
}

export default ApplyAutoLevel;
