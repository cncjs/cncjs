import PropTypes from 'prop-types';
import pubsub from 'pubsub-js';
import React, { PureComponent } from 'react';
import i18n from 'app/lib/i18n';
import controller from 'app/lib/controller';
import log from 'app/lib/log';
import { Button } from 'app/components/Buttons';
import Space from 'app/components/Space';
import { mapPositionToUnits, toDisplayUnits } from 'app/lib/units';
import {
  PROCESSING_PHASE_READING,
  PROCESSING_PHASE_COMPENSATING,
  PROCESSING_PHASE_LOADING,
} from './constants';
import styles from './ApplyView.styl';

// Pipeline states
const PIPELINE_EMPTY = 'empty';
const PIPELINE_PROCESSING = 'processing';
const PIPELINE_DONE = 'done';
const PIPELINE_ERROR = 'error';

class ApplyView extends PureComponent {
  static propTypes = {
    state: PropTypes.object.isRequired,
    actions: PropTypes.object.isRequired,
  };

  state = {
    pipelineState: PIPELINE_EMPTY,
    processingPhase: null, // PROCESSING_PHASE_READING | PROCESSING_PHASE_COMPENSATING | PROCESSING_PHASE_LOADING
    gcodeFileName: '',
    originalGcode: '',
    compensatedGcode: '',
    errorMessage: '',
  };

  pubsubTokens = [];

  fileInputEl = null;

  componentDidMount() {
    // Reset state when G-code is unloaded
    this.pubsubTokens.push(
      pubsub.subscribe('gcode:unload', () => {
        if (this.state.pipelineState === PIPELINE_DONE) {
          this.setState({
            pipelineState: PIPELINE_EMPTY,
            gcodeFileName: '',
            originalGcode: '',
            compensatedGcode: '',
            errorMessage: '',
          });
          log.info('Reset state after G-code unload');
        }
      })
    );

    // Reset state when a new G-code is loaded from outside (e.g. Visualizer)
    this.pubsubTokens.push(
      pubsub.subscribe('gcode:load', (_msg, data = {}) => {
        if (!data.isProbeCompensationApplied && this.state.pipelineState === PIPELINE_DONE) {
          this.setState({
            pipelineState: PIPELINE_EMPTY,
            gcodeFileName: '',
            originalGcode: '',
            compensatedGcode: '',
            errorMessage: '',
          });
          log.info('Reset state after new G-code load');
        }
      })
    );
  }

  componentWillUnmount() {
    this.pubsubTokens.forEach(token => {
      pubsub.unsubscribe(token);
    });
    this.pubsubTokens = [];
  }

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

    // Phase 1: Reading file
    this.setState({
      pipelineState: PIPELINE_PROCESSING,
      processingPhase: PROCESSING_PHASE_READING,
      gcodeFileName: file.name,
      originalGcode: '',
      compensatedGcode: '',
      errorMessage: '',
    });

    const reader = new FileReader();
    reader.onload = (e) => {
      const gcode = e.target.result;
      this.runPipeline(file.name, gcode);
    };
    reader.onerror = () => {
      this.setState({
        pipelineState: PIPELINE_ERROR,
        processingPhase: null,
        errorMessage: i18n._('Failed to read file'),
      });
    };
    reader.readAsText(file);

    // Reset file input value to allow loading the same file again
    event.target.value = '';
  };

  runPipeline = (fileName, gcode) => {
    const { state, actions } = this.props;
    const { probedPositions, port } = state;

    if (!gcode) {
      this.setState({
        pipelineState: PIPELINE_ERROR,
        processingPhase: null,
        errorMessage: i18n._('No G-code content'),
      });
      return;
    }

    if (!probedPositions || probedPositions.length < 3) {
      this.setState({
        pipelineState: PIPELINE_ERROR,
        processingPhase: null,
        gcodeFileName: fileName,
        originalGcode: gcode,
        errorMessage: i18n._('Insufficient probe data — minimum 3 points required'),
      });
      return;
    }

    // Start processing
    this.setState({
      pipelineState: PIPELINE_PROCESSING,
      processingPhase: PROCESSING_PHASE_COMPENSATING,
      gcodeFileName: fileName,
      originalGcode: gcode,
      compensatedGcode: '',
      errorMessage: '',
    });

    log.info(`Starting compensation for ${fileName}, probe points: ${probedPositions.length}`);

    // Call parent action with callbacks
    actions.applyToGcode(
      gcode,
      fileName,
      port,
      // Success callback
      (compensatedGcode) => {
        this.setState({
          pipelineState: PIPELINE_DONE,
          processingPhase: null,
          compensatedGcode,
        });
        log.info('Pipeline completed successfully');
      },
      // Error callback
      (errorMessage) => {
        this.setState({
          pipelineState: PIPELINE_ERROR,
          processingPhase: null,
          errorMessage,
        });
        log.error('Pipeline failed:', errorMessage);
      },
      // Progress callback
      (phase) => {
        this.setState({ processingPhase: phase });
      }
    );
  };

  handleClearGcode = () => {
    controller.command('gcode:unload');
    pubsub.publish('gcode:unload');

    this.setState({
      pipelineState: PIPELINE_EMPTY,
      gcodeFileName: '',
      originalGcode: '',
      compensatedGcode: '',
      errorMessage: '',
    });
  };

  handleRetry = () => {
    const { gcodeFileName, originalGcode } = this.state;
    if (originalGcode) {
      this.runPipeline(gcodeFileName, originalGcode);
    }
  };

  handleExport = () => {
    const { compensatedGcode, gcodeFileName } = this.state;

    if (compensatedGcode) {
      // Use cached compensated G-code directly
      const blob = new Blob([compensatedGcode], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AL_${gcodeFileName}`;
      a.click();
      URL.revokeObjectURL(url);
      log.info('Levelled G-code exported');
      return;
    }

    // Fallback to parent export
    const { originalGcode } = this.state;
    this.props.actions.exportLevelledGcode(originalGcode, gcodeFileName);
  };

  renderFileInput() {
    return (
      <input
        ref={(el) => {
          this.fileInputEl = el;
        }}
        type="file"
        accept=".gcode,.nc,.tap,.cnc"
        style={{ display: 'none' }}
        onChange={this.handleFileSelect}
      />
    );
  }

  renderEmpty() {
    const { state } = this.props;
    const { probedPositions } = state;
    const hasProbeData = probedPositions && probedPositions.length >= 3;

    if (!hasProbeData) {
      return (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>{i18n._('Probe Compensation')}</div>
          <div className={styles.warningBox}>
            <i className="fa fa-exclamation-triangle" style={{ marginRight: 5 }} />
            {i18n._('Insufficient probe data. At least 3 points are required for surface compensation.')}
          </div>
        </div>
      );
    }

    return (
      <div className={styles.section}>
        <div className={styles.sectionTitle}>{i18n._('Probe Compensation')}</div>
        <div className="form-group">
          <Button
            btnStyle="flat"
            onClick={this.handleLoadGcodeClick}
          >
            <i className="fa fa-folder-open" />
            {i18n._('Load G-code file')}
          </Button>
          <div className="help-block">
            {i18n._('Load a G-code file to apply probe compensation and send it to the workspace.')}
          </div>
          {this.renderFileInput()}
        </div>
      </div>
    );
  }

  renderProcessing() {
    const { processingPhase, gcodeFileName } = this.state;

    let phaseText;
    switch (processingPhase) {
      case PROCESSING_PHASE_READING:
        phaseText = i18n._('Reading {{filename}}...', { filename: gcodeFileName });
        break;
      case PROCESSING_PHASE_COMPENSATING:
        phaseText = i18n._('Applying compensation to {{filename}}...', { filename: gcodeFileName });
        break;
      case PROCESSING_PHASE_LOADING:
        phaseText = i18n._('Loading compensated G-code to workspace...');
        break;
      default:
        phaseText = i18n._('Processing...');
    }

    return (
      <div className={styles.section}>
        <div className={styles.sectionTitle}>{i18n._('Probe Compensation')}</div>
        <div className={styles.pipelineProgress}>
          <div className={styles.progressText}>
            <i className="fa fa-spinner fa-spin" style={{ marginRight: 5 }} />
            {phaseText}
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progressBarIndeterminate} />
          </div>
        </div>
      </div>
    );
  }

  renderDone() {
    const { gcodeFileName, compensatedGcode } = this.state;

    return (
      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          {i18n._('Probe Compensation')}
        </div>
        <div className="form-group">
          <div className={styles.gcodeDataInfo}>
            <span>AL_{gcodeFileName}</span>
            <button
              type="button"
              className={styles.gcodeCloseBtn}
              onClick={this.handleClearGcode}
              aria-label="Clear G-code"
            >
              <i className="fa fa-close" />
            </button>
          </div>
        </div>
        <div className="form-group">
          <Button
            btnStyle="flat"
            onClick={this.handleExport}
            disabled={!compensatedGcode}
          >
            <i className="fa fa-download" />
            {i18n._('Export Compensated G-code')}
          </Button>
          <div className="help-block">
            <span role="img" aria-label="Light bulb">💡</span>
            {' '}
            {i18n._('Download the compensated G-code file for use with other programs.')}
          </div>
        </div>
      </div>
    );
  }

  renderError() {
    const { gcodeFileName, errorMessage, originalGcode } = this.state;

    return (
      <div className={styles.section}>
        <div className={styles.sectionTitle}>{i18n._('Probe Compensation')}</div>
        <div className={styles.pipelineError}>
          <div className={styles.errorIcon}>
            <i className="fa fa-exclamation-triangle" />
          </div>
          <div className={styles.errorText}>
            <div className={styles.errorFileName}>
              {i18n._('Failed to compensate {{filename}}', { filename: gcodeFileName })}
            </div>
            {errorMessage && (
              <div className={styles.errorDetail}>{errorMessage}</div>
            )}
          </div>
        </div>
        {originalGcode && (
          <Button
            btnStyle="primary"
            btnSize="sm"
            onClick={this.handleRetry}
            style={{ marginTop: 10 }}
          >
            <i className="fa fa-refresh" style={{ marginRight: 5 }} />
            {i18n._('Retry')}
          </Button>
        )}
        <Button
          btnStyle="flat"
          btnSize="sm"
          onClick={this.handleLoadGcodeClick}
          style={{ marginTop: 5 }}
        >
          <i className="fa fa-folder-open" style={{ marginRight: 5 }} />
          {i18n._('Choose Different File')}
        </Button>
        {this.renderFileInput()}
      </div>
    );
  }

  render() {
    const { state, actions } = this.props;
    const { probeStats, units } = state;
    const { pipelineState } = this.state;

    return (
      <div>
        <div className={styles.sectionHeader}>
          <Button
            btnStyle="flat"
            btnSize="sm"
            compact
            onClick={actions.backToLanding}
          >
            <i className="fa fa-chevron-left" />
          </Button>
          <Space width={12} />
          {i18n._('APPLY COMPENSATION')}
        </div>

        {/* Probe Results - Always visible */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>{i18n._('Probe Results')}</div>
          {!probeStats && (
            <div className="form-group">
              <div className={styles.noData}>{i18n._('No probe data available')}</div>
            </div>
          )}
          {!!probeStats && (
            <div>
              <div className="form-group">
                <div className={styles.probeDataInfo}>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>{i18n._('Points probed:')}</span>
                    <span className={styles.infoValue}>{probeStats.points}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>{i18n._('Z-min:')}</span>
                    <span className={styles.infoValue}>{mapPositionToUnits(probeStats.minZ, units)} {toDisplayUnits(units)}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>{i18n._('Z-max:')}</span>
                    <span className={styles.infoValue}>{mapPositionToUnits(probeStats.maxZ, units)} {toDisplayUnits(units)}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>{i18n._('Max deviation:')}</span>
                    <span className={styles.infoValue}>{mapPositionToUnits(probeStats.maxDeviation, units)} {toDisplayUnits(units)}</span>
                  </div>
                </div>
              </div>
              <div className="form-group">
                <Button
                  btnStyle="flat"
                  onClick={actions.saveProbeData}
                >
                  <i className="fa fa-download" />
                  {i18n._('Export Probe Data')}
                </Button>
                <div className="help-block">
                  <span role="img" aria-label="Light bulb">💡</span>
                  {' '}
                  {i18n._('Save probe data to reuse it for multiple jobs on the same workpiece fixture.')}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pipeline section - state-based rendering */}
        {pipelineState === PIPELINE_EMPTY && this.renderEmpty()}
        {pipelineState === PIPELINE_PROCESSING && this.renderProcessing()}
        {pipelineState === PIPELINE_DONE && this.renderDone()}
        {pipelineState === PIPELINE_ERROR && this.renderError()}
      </div>
    );
  }
}

export default ApplyView;
