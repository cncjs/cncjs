import PropTypes from 'prop-types';
import React from 'react';
import i18n from 'app/lib/i18n';
import { IMPERIAL_UNITS } from 'app/constants';
import ProbeProgressDisplay from './ProbeProgressDisplay';
import { PROBE_STATE_IDLE, PROBE_STATE_RUNNING, PROBE_STATE_PAUSED, PROBE_STATE_STOPPED } from './constants';
import styles from './SetupProbeView.styl';

const SetupProbeView = ({ state, actions }) => {
  const {
    stepSize, startX, startY, endX, endY,
    clearanceHeight, probeStartZ, probeEndZ, probeFeedrate,
    probeState, probeProgress, canClick, units
  } = state;

  const displayUnits = i18n._('mm');
  const step = 1;

  // Define step size options based on units
  const IMPERIAL_STEP_SIZES = [1 / 16, 1 / 8, 1 / 4, 1 / 2, 1].map(v => v * 25.4);
  const METRIC_STEP_SIZES = [1, 2, 5, 10, 20];
  const isImperial = units === IMPERIAL_UNITS;
  const stepSizes = isImperial ? IMPERIAL_STEP_SIZES : METRIC_STEP_SIZES;
  const stepLabels = isImperial
    ? [i18n._('1/16"'), i18n._('1/8"'), i18n._('1/4"'), i18n._('1/2"'), i18n._('1"')]
    : [i18n._('1mm'), i18n._('2mm'), i18n._('5mm'), i18n._('10mm'), i18n._('20mm')];

  const numPointsX = Math.floor((endX - startX) / stepSize) + 1;
  const numPointsY = Math.floor((endY - startY) / stepSize) + 1;
  const totalPoints = numPointsX * numPointsY;
  const width = endX - startX;
  const height = endY - startY;

  const isProbing = probeState === PROBE_STATE_RUNNING;
  const isPaused = probeState === PROBE_STATE_PAUSED;
  const isStopped = probeState === PROBE_STATE_STOPPED;
  const canGoBack = probeState === PROBE_STATE_IDLE || isPaused || isStopped;

  return (
    <div className={styles.setupProbeView}>
      <div className={styles.sectionHeader}>
        <button
          type="button"
          onClick={actions.backToLanding}
          disabled={!canGoBack}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: canGoBack ? 'pointer' : 'not-allowed',
            opacity: canGoBack ? 1 : 0.5,
            marginRight: '8px'
          }}
        >
          <i className="fa fa-chevron-left" />
        </button>
        {i18n._('PROBE NEW SURFACE')}
      </div>

      <div className={styles.areaInfo} style={{ marginBottom: '10px', marginTop: '10px', lineHeight: '1.6' }}>
        <div><span role="img" aria-label="Pin">📍</span> {i18n._('{{count}} points', { count: totalPoints })}</div>
        <div><span role="img" aria-label="Ruler">📐</span> {width.toFixed(1)} {displayUnits} × {height.toFixed(1)} {displayUnits}</div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>{i18n._('Probe Grid')}</div>
        <div className="row no-gutters">
          <div className="col-xs-12">
            <div className="form-group">
              <label className="control-label">{i18n._('Step Size')}</label>
              <select
                className="form-control input-sm"
                value={stepSize}
                onChange={actions.handleStepSizeChange}
                disabled={isProbing}
              >
                {stepSizes.map((size, index) => (
                  <option key={size} value={size}>
                    {stepLabels[index]}
                  </option>
                ))}
              </select>
              <small className="text-muted">{i18n._('(snap interval = step ÷ 2)')}</small>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>{i18n._('Probe Area')}</div>
        <div className="row no-gutters">
          <div className="col-xs-6" style={{ paddingRight: 5 }}>
            <div className="form-group">
              <label className="control-label">{i18n._('Start X')}</label>
              <div className="input-group input-group-sm">
                <input type="number" className="form-control" name="startX" value={startX} step={step} min={-1000} onChange={actions.handleStartXChange} onFocus={actions.handleInputFocus} onBlur={actions.handleProbeAreaBlur} disabled={isProbing} />
                <div className="input-group-addon">{displayUnits}</div>
              </div>
            </div>
          </div>
          <div className="col-xs-6" style={{ paddingLeft: 5 }}>
            <div className="form-group">
              <label className="control-label">{i18n._('Start Y')}</label>
              <div className="input-group input-group-sm">
                <input type="number" className="form-control" name="startY" value={startY} step={step} min={-1000} onChange={actions.handleStartYChange} onFocus={actions.handleInputFocus} onBlur={actions.handleProbeAreaBlur} disabled={isProbing} />
                <div className="input-group-addon">{displayUnits}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="row no-gutters">
          <div className="col-xs-6" style={{ paddingRight: 5 }}>
            <div className="form-group">
              <label className="control-label">{i18n._('End X')}</label>
              <div className="input-group input-group-sm">
                <input type="number" className="form-control" name="endX" value={endX} step={step} min={-1000} onChange={actions.handleEndXChange} onFocus={actions.handleInputFocus} onBlur={actions.handleProbeAreaBlur} disabled={isProbing} />
                <div className="input-group-addon">{displayUnits}</div>
              </div>
            </div>
          </div>
          <div className="col-xs-6" style={{ paddingLeft: 5 }}>
            <div className="form-group">
              <label className="control-label">{i18n._('End Y')}</label>
              <div className="input-group input-group-sm">
                <input type="number" className="form-control" name="endY" value={endY} step={step} min={-1000} onChange={actions.handleEndYChange} onFocus={actions.handleInputFocus} onBlur={actions.handleProbeAreaBlur} disabled={isProbing} />
                <div className="input-group-addon">{displayUnits}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>{i18n._('Z-Axis Settings')}</div>
        <div className="form-group">
          <button type="button" className="btn btn-default" onClick={actions.runTestProbe} disabled={!canClick || isProbing}>
            <span role="img" aria-label="Microscope">🔬</span> {i18n._('Run Test Probe')}
          </button>
        </div>
        <div className="row no-gutters">
          <div className="col-xs-6" style={{ paddingRight: 5 }}>
            <div className="form-group">
              <label className="control-label">{i18n._('Clearance Height')}</label>
              <div className="input-group input-group-sm">
                <input type="number" className="form-control" value={clearanceHeight} min={0} step={step} onChange={actions.handleClearanceHeightChange} disabled={isProbing} />
                <div className="input-group-addon">{displayUnits}</div>
              </div>
              <small className="text-muted">{i18n._('(safe travel height)')}</small>
            </div>
          </div>
          <div className="col-xs-6" style={{ paddingLeft: 5 }}>
            <div className="form-group">
              <label className="control-label">{i18n._('Probe Start Z')}</label>
              <div className="input-group input-group-sm">
                <input type="number" className="form-control" value={probeStartZ} step={step} onChange={actions.handleProbeStartZChange} disabled={isProbing} />
                <div className="input-group-addon">{displayUnits}</div>
              </div>
              <small className="text-muted">{i18n._('(start probing from this height)')}</small>
            </div>
          </div>
        </div>
        <div className="row no-gutters">
          <div className="col-xs-6" style={{ paddingRight: 5 }}>
            <div className="form-group">
              <label className="control-label">{i18n._('Probe End Z')}</label>
              <div className="input-group input-group-sm">
                <input type="number" className="form-control" value={probeEndZ} step={step} onChange={actions.handleProbeEndZChange} disabled={isProbing} />
                <div className="input-group-addon">{displayUnits}</div>
              </div>
              <small className="text-muted">{i18n._('(maximum probe depth)')}</small>
            </div>
          </div>
          <div className="col-xs-6" style={{ paddingLeft: 5 }}>
            <div className="form-group">
              <label className="control-label">{i18n._('Probe Feedrate')}</label>
              <div className="input-group input-group-sm">
                <input type="number" className="form-control" value={probeFeedrate} min={1} step={1} onChange={actions.handleProbeFeedrateChange} disabled={isProbing} />
                <div className="input-group-addon">{i18n._('mm/min')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.section} style={{ marginBottom: 0 }}>
        {!isProbing ? (
          <button type="button" className="btn btn-sm btn-primary btn-block" onClick={actions.showStartProbeConfirmation} disabled={!canClick}>
            ▶ {i18n._('Start Probing')}
          </button>
        ) : (
          <button type="button" className="btn btn-sm btn-danger btn-block" onClick={actions.showStopProbeConfirmation}>
            ⏹ {i18n._('Stop Probing')}
          </button>
        )}
      </div>

      {isProbing && <ProbeProgressDisplay progress={probeProgress} actions={actions} />}
    </div>
  );
};

SetupProbeView.propTypes = {
  state: PropTypes.object.isRequired,
  actions: PropTypes.object.isRequired,
};

export default SetupProbeView;
