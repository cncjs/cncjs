import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import pubsub from 'pubsub-js';
import api from 'app/api';
import controller from 'app/lib/controller';
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
    compensatedGcode: '',
    showLevelled: false,
    isGeneratingPreview: false,
    isGeneratingCompensated: false,
  };

  pubsubTokens = [];

  componentDidMount() {
    // Subscribe to gcode:load events to get the loaded G-code
    this.pubsubTokens.push(
      pubsub.subscribe('gcode:load', (msg, data) => {
        const { name = '', gcode = '' } = data;

        // Reset all state when new G-code is loaded
        this.setState({
          gcodeFileName: name,
          gcode: gcode,
          showLevelled: false,
          compensatedGcode: '',
          isGeneratingPreview: false,
          isGeneratingCompensated: false,
        });

        // Always reset apply state when any G-code is loaded
        if (this.props.state.gcodeApplied) {
          this.props.actions.resetGcodeApplied();
        }

        log.info('[ApplyView] G-code loaded:', name);

        // Pre-generate compensated G-code in background for faster preview
        this.generateCompensatedGcode(gcode);
      })
    );
  }

  componentWillUnmount() {
    this.pubsubTokens.forEach(token => {
      pubsub.unsubscribe(token);
    });
    this.pubsubTokens = [];
  }

  fileInputEl = null;

  handleLoadGcodeClick = () => {
    if (!this.fileInputEl) {
      return;
    }
    this.fileInputEl.click();
  };

  handleFileSelect = (event) => {
    const files = event.target.files;
    const file = files[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const gcode = e.target.result;

      // Reset all state when new file is loaded
      this.setState({
        gcodeFileName: file.name,
        gcode: gcode,
        showLevelled: false,
        compensatedGcode: '',
        isGeneratingPreview: false,
        isGeneratingCompensated: false,
      });

      // Reset apply state
      if (this.props.state.gcodeApplied) {
        this.props.actions.resetGcodeApplied();
      }

      // Pre-generate compensated G-code in background
      this.generateCompensatedGcode(gcode);

      // Load G-code to visualizer
      pubsub.publish('gcode:load', { name: file.name, gcode: gcode });
    };
    reader.onerror = (e) => {
      log.error('Error reading file:', e);
    };
    reader.readAsText(file);

    // Reset file input value to allow loading the same file again
    event.target.value = '';
  };

  generateCompensatedGcode = (gcode) => {
    const { state } = this.props;
    const { probedPositions } = state;

    if (!gcode || probedPositions.length < 3) {
      return;
    }

    this.setState({ isGeneratingCompensated: true });

    controller.command('autolevel:applyProbeCompensation', {
      gcode,
      probeData: probedPositions,
    }, (err, result) => {
      this.setState({ isGeneratingCompensated: false });

      if (err) {
        log.error('Error generating compensated G-code:', err);
        return;
      }

      const { compensatedGcode } = result;
      this.setState({ compensatedGcode });
      log.info('Compensated G-code generated and ready');
    });
  };

  handleApply = () => {
    const { state, actions } = this.props;
    const { gcode, gcodeFileName, compensatedGcode } = this.state;
    const { probedPositions, port } = state;

    if (!gcode || probedPositions.length < 3) {
      log.error('Cannot apply: no G-code loaded or insufficient probing data');
      return;
    }

    // If we already have compensated G-code, use it directly
    if (compensatedGcode) {
      // Load compensated G-code to server
      const name = `AL_${gcodeFileName}`;
      api.loadGCode({ port, name, gcode: compensatedGcode })
        .then((res) => {
          const { name: loadedName = '', gcode: loadedGcode = '' } = { ...res.body };
          pubsub.publish('gcode:load', { name: loadedName, gcode: loadedGcode });

          // Update local state
          this.setState({
            gcodeFileName: loadedName,
            gcode: loadedGcode,
            showLevelled: false,
            compensatedGcode: '',
          });

          log.info('Auto-level applied and G-code loaded to server');
        })
        .catch(() => {
          log.error('Failed to load compensated G-code to server');
        });
      return;
    }

    // Otherwise, apply compensation and load to server (fallback)
    actions.applyToGcode(gcode, gcodeFileName, port);
  };

  handleExport = () => {
    const { gcode, gcodeFileName } = this.state;
    this.props.actions.exportLevelledGcode(gcode, gcodeFileName);
  };

  handleToggleOriginal = () => {
    this.setState({ showLevelled: false });
    // Show original G-code in visualizer
    const { gcode, gcodeFileName } = this.state;
    if (gcode) {
      pubsub.publish('gcode:load', { name: gcodeFileName, gcode });
    }
  };

  handleToggleLevelled = () => {
    const { state } = this.props;
    const { gcode, compensatedGcode } = this.state;
    const { probedPositions } = state;

    if (!gcode || probedPositions.length < 3) {
      log.warn('Cannot preview: no G-code loaded or insufficient probing data');
      return;
    }

    // If compensated G-code is already generated, use it
    if (compensatedGcode) {
      this.setState({ showLevelled: true });
      pubsub.publish('gcode:load', {
        name: `[Preview] AL_${this.state.gcodeFileName}`,
        gcode: compensatedGcode
      });
      log.info('Showing auto-levelled G-code preview');
      return;
    }

    // Generate compensated G-code for preview if not already available
    this.setState({ isGeneratingPreview: true });

    controller.command('autolevel:applyProbeCompensation', {
      gcode,
      probeData: probedPositions,
    }, (err, result) => {
      this.setState({ isGeneratingPreview: false });

      if (err) {
        log.error('Error generating preview:', err);
        return;
      }

      const { compensatedGcode } = result;
      this.setState({
        compensatedGcode,
        showLevelled: true,
      });

      // Show compensated G-code in visualizer
      pubsub.publish('gcode:load', {
        name: `[Preview] AL_${this.state.gcodeFileName}`,
        gcode: compensatedGcode
      });

      log.info('Auto-levelled G-code preview generated');
    });
  };

  render() {
    const { state, actions } = this.props;
    const { probeStats, gcodeApplied, canClick, probedPositions } = state;
    const { gcodeFileName, gcode, showLevelled, isGeneratingPreview, isGeneratingCompensated } = this.state;

    const hasGcode = gcode.length > 0;
    const hasProbeData = probedPositions && probedPositions.length >= 3;
    const isGenerating = isGeneratingPreview || isGeneratingCompensated;
    const canApply = hasGcode && hasProbeData && canClick && !gcodeApplied && !isGenerating;
    const canExport = hasGcode && hasProbeData && canClick && !isGenerating;

    return (
      <div className={styles.applyView}>
        <div className={styles.sectionHeader}>{i18n._('APPLY AUTO LEVEL')}</div>

        {/* Probe Results Summary - Always visible */}
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

        {/* G-code section */}
        {!hasGcode ? (
          // State 1: No G-code loaded
          <div className={styles.section}>
            <div className={styles.sectionTitle}>{i18n._('G-code Required')}</div>
            <div className={styles.noGcodeSection}>
              <div className={styles.noGcodeText}>
                {i18n._('No G-code loaded in workspace')}
              </div>
              <div className={styles.loadPrompt}>
                {i18n._('Load via Visualizer or click button below:')}
              </div>
              <button
                type="button"
                className="btn btn-sm btn-default"
                onClick={this.handleLoadGcodeClick}
                style={{ marginTop: 10 }}
              >
                <span role="img" aria-label="Folder">📁</span> {i18n._('Load G-code File')}
              </button>
              <input
                ref={(el) => {
                  this.fileInputEl = el;
                }}
                type="file"
                accept=".gcode,.nc,.tap,.cnc"
                style={{ display: 'none' }}
                onChange={this.handleFileSelect}
              />
            </div>
          </div>
        ) : (
          // State 2 & 3: G-code loaded
          <div className={styles.section}>
            <div className={styles.sectionTitle}>{i18n._('G-code Visualization')}</div>

            <div className={styles.fileInfoRow}>
              <div className={styles.fileInfo}>
                <span role="img" aria-label="File">📂</span> {i18n._('File')}: {gcodeApplied ? `AL_${gcodeFileName}` : gcodeFileName}
              </div>
              <button
                type="button"
                className="btn btn-xs btn-default"
                onClick={this.handleLoadGcodeClick}
                style={{ marginLeft: 8 }}
              >
                <span role="img" aria-label="Folder">📁</span> {i18n._('Load...')}
              </button>
              <input
                ref={(el) => {
                  this.fileInputEl = el;
                }}
                type="file"
                accept=".gcode,.nc,.tap,.cnc"
                style={{ display: 'none' }}
                onChange={this.handleFileSelect}
              />
            </div>

            <div className={styles.gcodeToggle}>
              <label>
                <input
                  type="radio"
                  name="gcodeView"
                  checked={!showLevelled}
                  onChange={() => this.handleToggleOriginal()}
                  disabled={isGeneratingPreview}
                />
                {' '}{i18n._('Original toolpath (3D)')}
              </label>
              <label style={{ marginLeft: 15 }}>
                <input
                  type="radio"
                  name="gcodeView"
                  checked={showLevelled}
                  onChange={() => this.handleToggleLevelled()}
                  disabled={isGeneratingPreview}
                />
                {' '}{i18n._('Auto-levelled toolpath (3D)')}
                {isGeneratingPreview && <span style={{ marginLeft: 5 }}>{i18n._('(Generating...)')}</span>}
              </label>
            </div>

            <div className={styles.gcodeInfo}>
              {gcode.split('\n').length} {i18n._('lines')}
              <span style={{ marginLeft: 10, color: '#666' }}>
                <span role="img" aria-label="Info">ℹ️</span> {i18n._('Toggle switches 3D visualizer')}
              </span>
            </div>

            {/* Loading indicator */}
            {isGeneratingCompensated && (
              <div className={styles.loadingMessage}>
                <i className="fa fa-spinner fa-spin" style={{ marginRight: 5 }} />
                {i18n._('Generating compensated G-code...')}
              </div>
            )}
          </div>
        )}

        {/* Primary Apply button */}
        {hasGcode && (
          <div className={styles.section}>
            <button
              type="button"
              className={classNames('btn', 'btn-block', { 'btn-primary': !gcodeApplied }, { 'btn-success': gcodeApplied })}
              onClick={this.handleApply}
              disabled={!canApply || gcodeApplied}
              style={{ marginBottom: 8 }}
            >
              <span role="img" aria-label="Check">✓</span>{' '}
              {gcodeApplied ? i18n._('Compensation Applied') : i18n._('Apply Auto-Level Compensation')}
            </button>

            {/* Success message */}
            {gcodeApplied && (
              <div className={styles.successMessage}>
                <span role="img" aria-label="Info">ℹ️</span>{' '}
                {i18n._('Applied to workspace. Compensated G-code is loaded.')}
              </div>
            )}
          </div>
        )}

        {/* Secondary actions - side by side */}
        <div className={styles.section}>
          <div className={styles.actionButtons}>
            <button
              type="button"
              className="btn btn-sm btn-default"
              onClick={actions.saveProbeData}
              disabled={!hasProbeData}
            >
              <span role="img" aria-label="Save">💾</span> {i18n._('Save Probe Data')}<br />{i18n._('(.probe)')}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-default"
              onClick={this.handleExport}
              disabled={!canExport}
            >
              <span role="img" aria-label="Upload">📤</span> {i18n._('Export Levelled')}<br />{i18n._('G-code')}
            </button>
          </div>
        </div>

        {/* Navigation footer */}
        <div className={styles.navigationFooter}>
          <button
            type="button"
            className="btn btn-sm btn-default"
            onClick={actions.backToLanding}
          >
            <span>← </span>{i18n._('Back')}
          </button>
        </div>
      </div>
    );
  }
}

export default ApplyView;
