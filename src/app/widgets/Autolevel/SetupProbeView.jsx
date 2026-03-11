import PropTypes from 'prop-types';
import React from 'react';
import { Button } from 'app/components/Buttons';
import Dropdown, { MenuItem } from 'app/components/Dropdown';
import { Infotip } from 'app/components/Tooltip';
import i18n from 'app/lib/i18n';
import { IMPERIAL_UNITS } from 'app/constants';
import ProbeAreaDiagram from './ProbeAreaDiagram';
import ProbeProgressDisplay from './ProbeProgressDisplay';
import ZProbeDiagram from './ZProbeDiagram';
import { PROBE_STATE_IDLE, PROBE_STATE_RUNNING, PROBE_STATE_PAUSED, PROBE_STATE_STOPPED } from './constants';
import styles from './SetupProbeView.styl';

const SetupProbeView = ({ state, actions }) => {
  const {
    stepSize, startX, startY, endX, endY,
    clearanceHeight, probeStartZ, probeEndZ, probeFeedrate,
    probeState, probeProgress, canClick, units,
    validationErrors = {},
  } = state;

  const displayUnits = i18n._('mm');
  const step = 1;

  // Define step size options based on units
  const IMPERIAL_STEP_SIZES = [1 / 16, 1 / 8, 1 / 4, 1 / 2, 1, 2, 4].map(v => v * 25.4);
  const METRIC_STEP_SIZES = [1, 2, 5, 10, 20, 50, 100];
  const isImperial = units === IMPERIAL_UNITS;
  const stepSizes = isImperial ? IMPERIAL_STEP_SIZES : METRIC_STEP_SIZES;
  const stepLabels = isImperial
    ? [i18n._('1/16"'), i18n._('1/8"'), i18n._('1/4"'), i18n._('1/2"'), i18n._('1"'), i18n._('2"'), i18n._('4"')]
    : [i18n._('1mm'), i18n._('2mm'), i18n._('5mm'), i18n._('10mm'), i18n._('20mm'), i18n._('50mm'), i18n._('100mm')];

  const numPointsX = Math.floor((endX - startX) / stepSize) + 1;
  const numPointsY = Math.floor((endY - startY) / stepSize) + 1;
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
            clearanceHeight={clearanceHeight}
            probeStartZ={probeStartZ}
            probeEndZ={probeEndZ}
            probeFeedrate={probeFeedrate}
          />
        </div>
        <div className="row no-gutters">
          <div className="col-xs-6" style={{ paddingRight: 5 }}>
            <div className="form-group">
              <label className="control-label">
                {i18n._('Probe Start Z')}
                {' '}
                <Infotip
                  placement="top"
                  content={i18n._('The starting Z position for each probe cycle')}
                >
                  <i className="fa fa-info-circle text-muted" />
                </Infotip>
              </label>
              <div className="input-group input-group-sm">
                <input type="number" className="form-control" value={probeStartZ} step={step} onChange={actions.handleProbeStartZChange} disabled={isProbing} />
                <div className="input-group-addon">{displayUnits}</div>
              </div>
              {validationErrors.probeStartZ && (
                <small style={{ color: '#a94442' }}>{validationErrors.probeStartZ}</small>
              )}
            </div>
          </div>
          <div className="col-xs-6" style={{ paddingLeft: 5 }}>
            <div className="form-group">
              <label className="control-label">
                {i18n._('Probe End Z')}
                {' '}
                <Infotip
                  content={i18n._('The ending Z position for each probe cycle — triggers alarm if no contact')}
                >
                  <i className="fa fa-info-circle text-muted" />
                </Infotip>
              </label>
              <div className="input-group input-group-sm">
                <input type="number" className="form-control" value={probeEndZ} step={step} onChange={actions.handleProbeEndZChange} disabled={isProbing} />
                <div className="input-group-addon">{displayUnits}</div>
              </div>
              {validationErrors.probeEndZ && (
                <small style={{ color: '#a94442' }}>{validationErrors.probeEndZ}</small>
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
                <input type="number" className="form-control" value={probeFeedrate} min={1} step={1} onChange={actions.handleProbeFeedrateChange} disabled={isProbing} />
                <div className="input-group-addon">{i18n._('mm/min')}</div>
              </div>
              {validationErrors.probeFeedrate && (
                <small style={{ color: '#a94442' }}>{validationErrors.probeFeedrate}</small>
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
                <input type="number" className="form-control" value={clearanceHeight} min={0} step={step} onChange={actions.handleClearanceHeightChange} disabled={isProbing} />
                <div className="input-group-addon">{displayUnits}</div>
              </div>
              {validationErrors.clearanceHeight && (
                <small style={{ color: '#a94442' }}>{validationErrors.clearanceHeight}</small>
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
          stepSize={stepSize}
        />
        <div className="row no-gutters">
          <div className="col-xs-12">
            <div className="form-group">
              <div>
                <label className="control-label">
                  {i18n._('Step Size')}
                  {' '}
                  <Infotip
                    placement="top"
                    content={i18n._('The XY spacing between probe points')}
                  >
                    <i className="fa fa-info-circle text-muted" />
                  </Infotip>
                </label>
              </div>
              <Dropdown
                disabled={isProbing}
              >
                <Dropdown.Toggle
                  btnStyle="flat"
                  btnSize="sm"
                >
                  {stepLabels[stepSizes.indexOf(stepSize)] || stepSize}
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  {stepSizes.map((size, index) => (
                    <MenuItem
                      key={size}
                      active={size === stepSize}
                      onSelect={() => actions.handleStepSizeSelect(size)}
                    >
                      {stepLabels[index]}
                    </MenuItem>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </div>
          </div>
        </div>
        <div className="row no-gutters">
          <div className="col-xs-6" style={{ paddingRight: 5 }}>
            <div className="form-group">
              <label className="control-label">{i18n._('Start X')}</label>
              <div className="input-group input-group-sm">
                <input type="number" className="form-control" name="startX" value={startX} step={step} min={-1000} onChange={actions.handleStartXChange} onFocus={actions.handleInputFocus} onBlur={actions.handleProbeAreaBlur} disabled={isProbing} />
                <div className="input-group-addon">{displayUnits}</div>
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
                <div className="input-group-addon">{displayUnits}</div>
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
                <div className="input-group-addon">{displayUnits}</div>
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
                <div className="input-group-addon">{displayUnits}</div>
              </div>
              {validationErrors.endY && (
                <small style={{ color: '#a94442' }}>{validationErrors.endY}</small>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className={styles.section} style={{ marginBottom: 0 }}>
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

      {isProbing && <ProbeProgressDisplay progress={probeProgress} actions={actions} />}
    </div>
  );
};

SetupProbeView.propTypes = {
  state: PropTypes.object.isRequired,
  actions: PropTypes.object.isRequired,
};

export default SetupProbeView;
