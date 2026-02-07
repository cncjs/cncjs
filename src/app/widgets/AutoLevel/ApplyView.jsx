import PropTypes from 'prop-types';
import pubsub from 'pubsub-js';
import React, { PureComponent } from 'react';
import i18n from 'app/lib/i18n';
import log from 'app/lib/log';
import { Button } from 'app/components/Buttons';
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
    // Subscribe to gcode:unload to reset state when G-code is unloaded
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
          log.info('[ApplyView] Reset state after G-code unload');
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
        errorMessage: i18n._('Insufficient probe data (minimum 3 points required)'),
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

    log.info(`[ApplyView] Starting compensation for ${fileName}, probe points: ${probedPositions.length}`);

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
        log.info('[ApplyView] Pipeline completed successfully');
      },
      // Error callback
      (errorMessage) => {
        this.setState({
          pipelineState: PIPELINE_ERROR,
          processingPhase: null,
          errorMessage,
        });
        log.error('[ApplyView] Pipeline failed:', errorMessage);
      },
      // Progress callback
      (phase) => {
        this.setState({ processingPhase: phase });
      }
    );
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
          <div className={styles.sectionTitle}>{i18n._('G-code Compensation')}</div>
          <div className={styles.warningBox}>
            <i className="fa fa-exclamation-triangle" style={{ marginRight: 5 }} />
            {i18n._('Insufficient probe data. At least 3 points are required for surface compensation.')}
          </div>
        </div>
      );
    }

    return (
      <div className={styles.section}>
        <div className={styles.sectionTitle}>{i18n._('G-code Compensation')}</div>
        <div className={styles.noGcodeSection}>
          <div className={styles.noGcodeText}>
            {i18n._('No G-code loaded in workspace')}
          </div>
          <Button
            btnStyle="primary"
            onClick={this.handleLoadGcodeClick}
            style={{ marginTop: 10 }}
          >
            <i className="fa fa-folder-open" />
            {i18n._('Load & Apply Auto-Level')}
          </Button>
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
        <div className={styles.sectionTitle}>{i18n._('G-code Compensation')}</div>
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
          {i18n._('G-code Compensation')}
        </div>
        <div className="form-group">
          <Button
            btnStyle="flat"
            btnSize="sm"
            onClick={this.handleExport}
            disabled={!compensatedGcode}
          >
            <i className="fa fa-download" />
            {i18n._('Export compensated G-code')}
          </Button>
        </div>
        <div className="form-group">
          <div className={styles.gcodeDataInfo}>
            AL_{gcodeFileName}
          </div>
        </div>
        <Button
          btnStyle="primary"
          onClick={this.handleLoadGcodeClick}
        >
          <i className="fa fa-folder-open" />
          {i18n._('Change G-code file')}
        </Button>
        {this.renderFileInput()}
      </div>
    );
  }

  renderError() {
    const { gcodeFileName, errorMessage, originalGcode } = this.state;

    return (
      <div className={styles.section}>
        <div className={styles.sectionTitle}>{i18n._('G-code Compensation')}</div>
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
          {i18n._('Choose different file')}
        </Button>
        {this.renderFileInput()}
      </div>
    );
  }

  render() {
    const { state, actions } = this.props;
    const { probeStats } = state;
    const { pipelineState } = this.state;

    return (
      <div className={styles.applyView}>
        <div className={styles.sectionHeader}>
          <button
            type="button"
            onClick={actions.backToLanding}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              marginRight: '8px'
            }}
          >
            <i className="fa fa-chevron-left" />
          </button>
          {i18n._('APPLY AUTO-LEVEL')}
        </div>

        {/* Probe Results - Always visible */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>{i18n._('Probe Results')}</div>
          {!!probeStats && (
            <div className="form-group">
              <Button
                btnStyle="flat"
                btnSize="sm"
                onClick={actions.saveProbeData}
              >
                <i className="fa fa-download" />
                {i18n._('Export probe data')}
              </Button>
            </div>
          )}
          {probeStats ? (
            <div className={styles.probeDataInfo}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>{i18n._('Points Probed')}:</span>
                <span className={styles.infoValue}>{probeStats.points} &#10003;</span>
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
