import PropTypes from 'prop-types';
import React from 'react';
import i18n from 'app/lib/i18n';
import ProbeProgressDisplay from './ProbeProgressDisplay';
import { PROBE_STATE_IDLE, PROBE_STATE_RUNNING, PROBE_STATE_PAUSED, PROBE_STATE_STOPPED } from './constants';
import styles from './SetupProbeView.styl';

const SetupProbeView = ({ state, actions }) => {
  const {
    stepSize, startX, startY, endX, endY,
    clearanceHeight, probeStartZ, probeEndZ, probeFeedrate,
    probeState, probeProgress, canClick, showProbePreview
  } = state;

  const displayUnits = i18n._('mm');
  const step = 1;

  const numPointsX = Math.floor((endX - startX) / stepSize) + 1;
  const numPointsY = Math.floor((endY - startY) / stepSize) + 1;
  const totalPoints = numPointsX * numPointsY;
  const area = (endX - startX) * (endY - startY);

  const isProbing = probeState === PROBE_STATE_RUNNING;
  const isPaused = probeState === PROBE_STATE_PAUSED;
  const isStopped = probeState === PROBE_STATE_STOPPED;
  const canGoBack = probeState === PROBE_STATE_IDLE || isPaused || isStopped;

  return (
    <div className={styles.setupProbeView}>
      <div className={styles.sectionHeader}>{i18n._('PROBE NEW SURFACE')}</div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>{i18n._('Probe Grid')}</div>
        <div className="row no-gutters">
          <div className="col-xs-6" style={{ paddingRight: 5 }}>
            <div className="form-group">
              <label className="control-label">{i18n._('Step Size')}</label>
              <div className="input-group input-group-sm">
                <input
                  type="number"
                  className="form-control"
                  value={stepSize}
                  min={1}
                  step={step}
                  onChange={actions.handleStepSizeChange}
                  disabled={isProbing}
                />
                <div className="input-group-addon">{displayUnits}</div>
              </div>
            </div>
          </div>
          <div className="col-xs-6" style={{ paddingLeft: 5 }}>
            <div className={styles.gridInfo}>
              {i18n._('Grid')}: {numPointsX}×{numPointsY} ({totalPoints} {i18n._('points')})
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
        <div className={styles.areaInfo}>
          <span role="img" aria-label="Ruler">📐</span> {i18n._('Area')}: {area.toFixed(1)} {displayUnits}² | <span role="img" aria-label="Pin">📍</span> {i18n._('Points')}: {totalPoints}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>{i18n._('Z-Axis Settings')}</div>
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
              <small className="text-muted">{i18n._('(begin probing from)')}</small>
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
              <small className="text-muted">{i18n._('(max probe depth)')}</small>
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

      <div className={styles.section}>
        <div className={styles.sectionTitle}>{i18n._('Preview')}</div>
        <div style={{ marginBottom: 10 }}>
          <label>
            <input
              type="checkbox"
              checked={showProbePreview}
              onChange={actions.toggleProbePreview}
            />
            {' '}
            {i18n._('Show probe area in 3D viewer')}
          </label>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>{i18n._('Test & Start')}</div>
        <div className={styles.buttonRow}>
          <button type="button" className="btn btn-sm btn-default" onClick={actions.runTestProbe} disabled={!canClick || isProbing}>
            <span role="img" aria-label="Microscope">🔬</span> {i18n._('Run Test Probe')}
          </button>
          {!isProbing ? (
            <button type="button" className="btn btn-sm btn-primary" onClick={actions.showStartProbeConfirmation} disabled={!canClick}>
              ▶ {i18n._('Start Probing')}
            </button>
          ) : (
            <button type="button" className="btn btn-sm btn-danger" onClick={actions.showStopProbeConfirmation}>
              ⏹ {i18n._('Stop Probing')}
            </button>
          )}
        </div>
      </div>

      {isProbing && <ProbeProgressDisplay progress={probeProgress} actions={actions} />}

      <div className={styles.navigationFooter}>
        <button type="button" className="btn btn-sm btn-default" onClick={actions.backToLanding} disabled={!canGoBack}>
          ← {i18n._('Back')}
        </button>
      </div>
    </div>
  );
};

SetupProbeView.propTypes = {
  state: PropTypes.object.isRequired,
  actions: PropTypes.object.isRequired,
};

export default SetupProbeView;
