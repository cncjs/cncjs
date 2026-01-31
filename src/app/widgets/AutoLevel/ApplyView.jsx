import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import i18n from 'app/lib/i18n';
import log from 'app/lib/log';
import styles from './ApplyView.styl';

class ApplyView extends PureComponent {
  static propTypes = {
    state: PropTypes.object.isRequired,
    actions: PropTypes.object.isRequired,
  };

  state = {
    gcodeFileName: '',
    gcode: '',
    showLevelled: false,
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
    const { gcode, gcodeFileName } = this.state;
    this.props.actions.applyToGcode(gcode, gcodeFileName);
  };

  handleExport = () => {
    const { gcode, gcodeFileName } = this.state;
    this.props.actions.exportLevelledGcode(gcode, gcodeFileName);
  };

  render() {
    const { state, actions } = this.props;
    const { probeStats, gcodeApplied, canClick, probedPositions } = state;
    const { gcodeFileName, gcode, showLevelled } = this.state;

    const hasGcode = gcode.length > 0;
    const hasProbeData = probedPositions && probedPositions.length >= 3;
    const canApply = hasGcode && hasProbeData && canClick && !gcodeApplied;
    const canExport = hasGcode && hasProbeData && canClick;

    return (
      <div className={styles.applyView}>
        <div className={styles.sectionHeader}>{i18n._('Apply Auto Level')}</div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>{i18n._('Probe Results Summary')}</div>
          {probeStats ? (
            <div className={styles.probeDataInfo}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>{i18n._('Points Probed')}:</span>
                <span className={styles.infoValue}>{probeStats.points} ✓</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>{i18n._('Z-Range')}:</span>
                <span className={styles.infoValue}>
                  {probeStats.minZ.toFixed(3)} ~ {probeStats.maxZ.toFixed(3)} mm
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>{i18n._('Max Deviation')}:</span>
                <span className={styles.infoValue}>{probeStats.maxDeviation.toFixed(3)} mm</span>
              </div>
            </div>
          ) : (
            <div className={styles.noData}>{i18n._('No probe data available')}</div>
          )}
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>{i18n._('G-code Preview')}</div>

          {!hasGcode && (
            <div className={styles.noData}>
              {i18n._('No G-code file loaded')}
              <br />
              {i18n._('Load a G-code file to preview auto-leveling.')}
            </div>
          )}

          {hasGcode && (
            <div>
              <div className={styles.fileInfo}>
                <span role="img" aria-label="File">📂</span> {i18n._('File')}: {gcodeFileName}
              </div>

              <div className={styles.gcodeToggle}>
                <label>
                  <input
                    type="radio"
                    name="gcodeView"
                    checked={!showLevelled}
                    onChange={() => this.setState({ showLevelled: false })}
                  />
                  {' '}{i18n._('Original G-code')}
                </label>
                <label style={{ marginLeft: 15 }}>
                  <input
                    type="radio"
                    name="gcodeView"
                    checked={showLevelled}
                    onChange={() => this.setState({ showLevelled: true })}
                  />
                  {' '}{i18n._('Auto-levelled G-code')}
                </label>
              </div>
            </div>
          )}

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
            className="btn btn-sm btn-default btn-block"
            onClick={() => this.fileInputEl && this.fileInputEl.click()}
            style={{ marginTop: 10 }}
          >
            {hasGcode ? i18n._('Load Different G-code File') : i18n._('Load G-code File')}
          </button>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>{i18n._('Actions')}</div>

          <button
            type="button"
            className="btn btn-sm btn-default btn-block"
            onClick={actions.saveProbeData}
            style={{ marginBottom: 5 }}
          >
            <span role="img" aria-label="Save">💾</span> {i18n._('Save Probe Data (.probe)')}
          </button>

          <button
            type="button"
            className="btn btn-sm btn-primary btn-block"
            onClick={this.handleApply}
            disabled={!canApply}
            style={{ marginBottom: 5 }}
          >
            <span role="img" aria-label="Document">📄</span> {gcodeApplied ? i18n._('Already Applied') : i18n._('Apply to G-code')}
          </button>

          <button
            type="button"
            className="btn btn-sm btn-default btn-block"
            onClick={this.handleExport}
            disabled={!canExport}
          >
            <span role="img" aria-label="Upload">📤</span> {i18n._('Export Levelled G-code')}
          </button>
        </div>

        <div className={styles.navigationFooter}>
          <button
            type="button"
            className="btn btn-sm btn-default"
            onClick={actions.closeWidget}
          >
            {i18n._('Close')}
          </button>
        </div>
      </div>
    );
  }
}

export default ApplyView;
