import PropTypes from 'prop-types';
import React from 'react';
import { ProgressBar } from 'react-bootstrap';
import { Button } from 'app/components/Buttons';
import { Infotip } from 'app/components/Tooltip';
import i18n from 'app/lib/i18n';
import { METRIC_UNITS } from 'app/constants';
import { toDisplayUnits } from 'app/lib/units';
import ProbeAreaDiagram from './ProbeAreaDiagram';
import ZProbeDiagram from './ZProbeDiagram';
import { PROBE_STATE_IDLE, PROBE_STATE_RUNNING, PROBE_STATE_PAUSED, PROBE_STATE_STOPPED } from './constants';
import styles from './SetupProbeView.styl';

const SetupProbeView = ({ state, actions }) => {
  const {
    stepX, stepY, startX, startY, endX, endY,
    clearanceZ, startZ, endZ, feedrate,
    probeState, probeProgress, canClick, units,
    validationErrors = {},
  } = state;

  const step = 1;
  const feedrateUnits = (units === METRIC_UNITS) ? i18n._('mm/min') : i18n._('in/min');

  const numPointsX = Math.floor((endX - startX) / stepX) + 1;
  const numPointsY = Math.floor((endY - startY) / stepY) + 1;
  const totalPoints = numPointsX * numPointsY;

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
      <div className={styles.section}>
        <div className={styles.sectionTitle}>{i18n._('Z-Axis Settings')}</div>
        <div className="form-group">
          <Button
            btnStyle="flat"
            onClick={actions.showTestProbeConfirmation}
            disabled={!canClick || isProbing}
          >
            {i18n._('Test Probe')}
          </Button>
        </div>
        <div className="form-group">
          <ZProbeDiagram
            clearanceZ={clearanceZ}
            startZ={startZ}
            endZ={endZ}
            feedrate={feedrate}
            units={units}
          />
        </div>
        <div className="row no-gutters">
          <div className="col-xs-6" style={{ paddingRight: 5 }}>
            <div className="form-group">
              <label className="control-label">
                {i18n._('Start Z')}
                {' '}
                <Infotip
                  placement="top"
                  content={i18n._('The starting Z position for each probe cycle')}
                >
                  <i className="fa fa-info-circle text-muted" />
                </Infotip>
              </label>
              <div className="input-group input-group-sm">
                <input type="number" className="form-control" value={startZ} step={step} onChange={actions.handleStartZChange} disabled={isProbing} />
                <div className="input-group-addon">{toDisplayUnits(units)}</div>
              </div>
              {validationErrors.startZ && (
                <small style={{ color: '#a94442' }}>{validationErrors.startZ}</small>
              )}
            </div>
          </div>
          <div className="col-xs-6" style={{ paddingLeft: 5 }}>
            <div className="form-group">
              <label className="control-label">
                {i18n._('End Z')}
                {' '}
                <Infotip
                  content={i18n._('The ending Z position for each probe cycle — triggers alarm if no contact')}
                >
                  <i className="fa fa-info-circle text-muted" />
                </Infotip>
              </label>
              <div className="input-group input-group-sm">
                <input type="number" className="form-control" value={endZ} step={step} onChange={actions.handleEndZChange} disabled={isProbing} />
                <div className="input-group-addon">{toDisplayUnits(units)}</div>
              </div>
              {validationErrors.endZ && (
                <small style={{ color: '#a94442' }}>{validationErrors.endZ}</small>
              )}
            </div>
          </div>
        </div>
        <div className="row no-gutters">
          <div className="col-xs-6" style={{ paddingRight: 5 }}>
            <div className="form-group">
              <label className="control-label">
                {i18n._('Probe Feedrate')}
                {' '}
                <Infotip
                  placement="top"
                  content={i18n._('The feed rate for the probe descent')}
                >
                  <i className="fa fa-info-circle text-muted" />
                </Infotip>
              </label>
              <div className="input-group input-group-sm">
                <input type="number" className="form-control" value={feedrate} min={1} step={1} onChange={actions.handleProbeFeedrateChange} disabled={isProbing} />
                <div className="input-group-addon">{feedrateUnits}</div>
              </div>
              {validationErrors.feedrate && (
                <small style={{ color: '#a94442' }}>{validationErrors.feedrate}</small>
              )}
            </div>
          </div>
          <div className="col-xs-6" style={{ paddingLeft: 5 }}>
            <div className="form-group">
              <label className="control-label">
                {i18n._('Clearance Z')}
                {' '}
                <Infotip
                  placement="top"
                  content={i18n._('The clearance Z position for rapid moves between probe points')}
                >
                  <i className="fa fa-info-circle text-muted" />
                </Infotip>
              </label>
              <div className="input-group input-group-sm">
                <input type="number" className="form-control" value={clearanceZ} min={0} step={step} onChange={actions.handleClearanceZChange} disabled={isProbing} />
                <div className="input-group-addon">{toDisplayUnits(units)}</div>
              </div>
              {validationErrors.clearanceZ && (
                <small style={{ color: '#a94442' }}>{validationErrors.clearanceZ}</small>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className={styles.section}>
        <div className={styles.sectionTitle}>{i18n._('Probe Area')}</div>
        <div style={{ textAlign: 'center', color: '#666' }}>
          {i18n._('{{count}} points', { count: totalPoints })}
        </div>
        <ProbeAreaDiagram
          startX={startX}
          startY={startY}
          endX={endX}
          endY={endY}
          stepX={stepX}
          stepY={stepY}
          units={units}
        />
        <div className="row no-gutters">
          <div className="col-xs-6" style={{ paddingRight: 5 }}>
            <div className="form-group">
              <label className="control-label">{i18n._('Start X')}</label>
              <div className="input-group input-group-sm">
                <input type="number" className="form-control" name="startX" value={startX} step={step} min={-1000} onChange={actions.handleStartXChange} onFocus={actions.handleInputFocus} onBlur={actions.handleProbeAreaBlur} disabled={isProbing} />
                <div className="input-group-addon">{toDisplayUnits(units)}</div>
              </div>
              {validationErrors.startX && (
                <small style={{ color: '#a94442' }}>{validationErrors.startX}</small>
              )}
            </div>
          </div>
          <div className="col-xs-6" style={{ paddingLeft: 5 }}>
            <div className="form-group">
              <label className="control-label">{i18n._('Start Y')}</label>
              <div className="input-group input-group-sm">
                <input type="number" className="form-control" name="startY" value={startY} step={step} min={-1000} onChange={actions.handleStartYChange} onFocus={actions.handleInputFocus} onBlur={actions.handleProbeAreaBlur} disabled={isProbing} />
                <div className="input-group-addon">{toDisplayUnits(units)}</div>
              </div>
              {validationErrors.startY && (
                <small style={{ color: '#a94442' }}>{validationErrors.startY}</small>
              )}
            </div>
          </div>
        </div>
        <div className="row no-gutters">
          <div className="col-xs-6" style={{ paddingRight: 5 }}>
            <div className="form-group">
              <label className="control-label">{i18n._('End X')}</label>
              <div className="input-group input-group-sm">
                <input type="number" className="form-control" name="endX" value={endX} step={step} min={-1000} onChange={actions.handleEndXChange} onFocus={actions.handleInputFocus} onBlur={actions.handleProbeAreaBlur} disabled={isProbing} />
                <div className="input-group-addon">{toDisplayUnits(units)}</div>
              </div>
              {validationErrors.endX && (
                <small style={{ color: '#a94442' }}>{validationErrors.endX}</small>
              )}
            </div>
          </div>
          <div className="col-xs-6" style={{ paddingLeft: 5 }}>
            <div className="form-group">
              <label className="control-label">{i18n._('End Y')}</label>
              <div className="input-group input-group-sm">
                <input type="number" className="form-control" name="endY" value={endY} step={step} min={-1000} onChange={actions.handleEndYChange} onFocus={actions.handleInputFocus} onBlur={actions.handleProbeAreaBlur} disabled={isProbing} />
                <div className="input-group-addon">{toDisplayUnits(units)}</div>
              </div>
              {validationErrors.endY && (
                <small style={{ color: '#a94442' }}>{validationErrors.endY}</small>
              )}
            </div>
          </div>
        </div>
        <div className="row no-gutters">
          <div className="col-xs-6" style={{ paddingRight: 5 }}>
            <div className="form-group">
              <label className="control-label">
                {i18n._('Step X')}
                {' '}
                <Infotip
                  placement="top"
                  content={i18n._('The X spacing between probe points')}
                >
                  <i className="fa fa-info-circle text-muted" />
                </Infotip>
              </label>
              <div className="input-group input-group-sm">
                <input
                  type="number"
                  className="form-control"
                  value={stepX}
                  step={step}
                  onChange={actions.handleStepXChange}
                  disabled={isProbing}
                />
                <div className="input-group-addon">{toDisplayUnits(units)}</div>
              </div>
              {validationErrors.stepX && (
                <small style={{ color: '#a94442' }}>{validationErrors.stepX}</small>
              )}
            </div>
          </div>
          <div className="col-xs-6" style={{ paddingLeft: 5 }}>
            <div className="form-group">
              <label className="control-label">
                {i18n._('Step Y')}
                {' '}
                <Infotip
                  placement="top"
                  content={i18n._('The Y spacing between probe points')}
                >
                  <i className="fa fa-info-circle text-muted" />
                </Infotip>
              </label>
              <div className="input-group input-group-sm">
                <input
                  type="number"
                  className="form-control"
                  value={stepY}
                  step={step}
                  onChange={actions.handleStepYChange}
                  disabled={isProbing}
                />
                <div className="input-group-addon">{toDisplayUnits(units)}</div>
              </div>
              {validationErrors.stepY && (
                <small style={{ color: '#a94442' }}>{validationErrors.stepY}</small>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className={styles.section}>
        {isProbing && probeProgress && (
          <div style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 8 }}>
              {i18n._('Probing progress: {{current}}/{{total}} points', { current: probeProgress.current, total: probeProgress.total })}
            </div>
            <ProgressBar
              bsStyle="info"
              min={0}
              max={probeProgress.total}
              now={probeProgress.current}
              label={`${probeProgress.percentage}%`}
            />
          </div>
        )}
        {!isProbing ? (
          <Button
            btnStyle="primary"
            onClick={actions.showStartProbeConfirmation}
            disabled={!canClick}
          >
            <i className="fa fa-play" />
            {i18n._('Start Probing')}
          </Button>
        ) : (
          <Button
            btnStyle="danger"
            onClick={actions.showStopProbeConfirmation}
          >
            <i className="fa fa-stop" />
            {i18n._('Stop Probing')}
          </Button>
        )}
      </div>
    </div>
  );
};

SetupProbeView.propTypes = {
  state: PropTypes.object.isRequired,
  actions: PropTypes.object.isRequired,
};

export default SetupProbeView;
