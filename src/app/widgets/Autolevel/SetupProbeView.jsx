import { Space, TextLabel } from '@tonic-ui/react';
import PropTypes from 'prop-types';
import React from 'react';
import { Button } from '@app/components/Buttons';
import ProgressBar from '@app/components/ProgressBar';
import FormGroup from '@app/components/FormGroup';
import Input from '@app/components/FormControl/Input';
import Infotip from '@app/components/Infotip';
import InputGroup from '@app/components/InputGroup';
import { Row, Col } from '@app/components/GridSystem';
import i18n from '@app/lib/i18n';
import { METRIC_UNITS } from '@app/constants';
import { toDisplayUnits } from '@app/lib/units';
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
        <Button
          btnStyle="flat"
          btnSize="sm"
          compact
          onClick={actions.backToLanding}
          disabled={!canGoBack}
        >
          <i className="fa fa-chevron-left" />
        </Button>
        <Space width={12} />
        {i18n._('PROBE NEW SURFACE')}
      </div>
      <div className={styles.section}>
        <div className={styles.sectionTitle}>{i18n._('Z-Axis Settings')}</div>
        <FormGroup>
          <Button
            btnStyle="flat"
            onClick={actions.showTestProbeConfirmation}
            disabled={!canClick || isProbing}
          >
            {i18n._('Test Probe')}
          </Button>
        </FormGroup>
        <FormGroup>
          <ZProbeDiagram
            clearanceZ={clearanceZ}
            startZ={startZ}
            endZ={endZ}
            feedrate={feedrate}
            units={units}
          />
        </FormGroup>
        <Row>
          <Col>
            <FormGroup>
              <TextLabel mb="2x">
                {i18n._('Start Z')}
                {' '}
                <Infotip
                  placement="top"
                  content={i18n._('The starting Z position for each probe cycle')}
                >
                  <i className="fa fa-info-circle text-muted" />
                </Infotip>
              </TextLabel>
              <InputGroup sm>
                <Input
                  type="number"
                  value={startZ}
                  step={step}
                  onChange={actions.handleStartZChange}
                  disabled={isProbing}
                />
                <InputGroup.Append>
                  <InputGroup.Text>{toDisplayUnits(units)}</InputGroup.Text>
                </InputGroup.Append>
              </InputGroup>
              {validationErrors.startZ && (
                <small style={{ color: '#a94442' }}>{validationErrors.startZ}</small>
              )}
            </FormGroup>
          </Col>
          <Col>
            <FormGroup>
              <TextLabel mb="2x">
                {i18n._('End Z')}
                {' '}
                <Infotip
                  content={i18n._('The ending Z position for each probe cycle — triggers alarm if no contact')}
                >
                  <i className="fa fa-info-circle text-muted" />
                </Infotip>
              </TextLabel>
              <InputGroup sm>
                <Input
                  type="number"
                  value={endZ}
                  step={step}
                  onChange={actions.handleEndZChange}
                  disabled={isProbing}
                />
                <InputGroup.Append>
                  <InputGroup.Text>{toDisplayUnits(units)}</InputGroup.Text>
                </InputGroup.Append>
              </InputGroup>
              {validationErrors.endZ && (
                <small style={{ color: '#a94442' }}>{validationErrors.endZ}</small>
              )}
            </FormGroup>
          </Col>
        </Row>
        <Row>
          <Col>
            <FormGroup>
              <TextLabel mb="2x">
                {i18n._('Probe Feedrate')}
                {' '}
                <Infotip
                  placement="top"
                  content={i18n._('The feed rate for the probe descent')}
                >
                  <i className="fa fa-info-circle text-muted" />
                </Infotip>
              </TextLabel>
              <InputGroup sm>
                <Input
                  type="number"
                  value={feedrate}
                  min={1}
                  step={1}
                  onChange={actions.handleProbeFeedrateChange}
                  disabled={isProbing}
                />
                <InputGroup.Append>
                  <InputGroup.Text>{feedrateUnits}</InputGroup.Text>
                </InputGroup.Append>
              </InputGroup>
              {validationErrors.feedrate && (
                <small style={{ color: '#a94442' }}>{validationErrors.feedrate}</small>
              )}
            </FormGroup>
          </Col>
          <Col>
            <FormGroup>
              <TextLabel mb="2x">
                {i18n._('Clearance Z')}
                {' '}
                <Infotip
                  placement="top"
                  content={i18n._('The clearance Z position for rapid moves between probe points')}
                >
                  <i className="fa fa-info-circle text-muted" />
                </Infotip>
              </TextLabel>
              <InputGroup sm>
                <Input
                  type="number"
                  value={clearanceZ}
                  min={0}
                  step={step}
                  onChange={actions.handleClearanceZChange}
                  disabled={isProbing}
                />
                <InputGroup.Append>
                  <InputGroup.Text>{toDisplayUnits(units)}</InputGroup.Text>
                </InputGroup.Append>
              </InputGroup>
              {validationErrors.clearanceZ && (
                <small style={{ color: '#a94442' }}>{validationErrors.clearanceZ}</small>
              )}
            </FormGroup>
          </Col>
        </Row>
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
        <Row>
          <Col>
            <FormGroup>
              <TextLabel mb="2x">{i18n._('Start X')}</TextLabel>
              <InputGroup sm>
                <Input
                  type="number"
                  name="startX"
                  value={startX}
                  step={step}
                  min={-1000}
                  onChange={actions.handleStartXChange}
                  onFocus={actions.handleInputFocus}
                  onBlur={actions.handleProbeAreaBlur}
                  disabled={isProbing}
                />
                <InputGroup.Append>
                  <InputGroup.Text>{toDisplayUnits(units)}</InputGroup.Text>
                </InputGroup.Append>
              </InputGroup>
              {validationErrors.startX && (
                <small style={{ color: '#a94442' }}>{validationErrors.startX}</small>
              )}
            </FormGroup>
          </Col>
          <Col>
            <FormGroup>
              <TextLabel mb="2x">{i18n._('Start Y')}</TextLabel>
              <InputGroup sm>
                <Input
                  type="number"
                  name="startY"
                  value={startY}
                  step={step}
                  min={-1000}
                  onChange={actions.handleStartYChange}
                  onFocus={actions.handleInputFocus}
                  onBlur={actions.handleProbeAreaBlur}
                  disabled={isProbing}
                />
                <InputGroup.Append>
                  <InputGroup.Text>{toDisplayUnits(units)}</InputGroup.Text>
                </InputGroup.Append>
              </InputGroup>
              {validationErrors.startY && (
                <small style={{ color: '#a94442' }}>{validationErrors.startY}</small>
              )}
            </FormGroup>
          </Col>
        </Row>
        <Row>
          <Col>
            <FormGroup>
              <TextLabel mb="2x">{i18n._('End X')}</TextLabel>
              <InputGroup sm>
                <Input
                  type="number"
                  name="endX"
                  value={endX}
                  step={step}
                  min={-1000}
                  onChange={actions.handleEndXChange}
                  onFocus={actions.handleInputFocus}
                  onBlur={actions.handleProbeAreaBlur}
                  disabled={isProbing}
                />
                <InputGroup.Append>
                  <InputGroup.Text>{toDisplayUnits(units)}</InputGroup.Text>
                </InputGroup.Append>
              </InputGroup>
              {validationErrors.endX && (
                <small style={{ color: '#a94442' }}>{validationErrors.endX}</small>
              )}
            </FormGroup>
          </Col>
          <Col>
            <FormGroup>
              <TextLabel mb="2x">{i18n._('End Y')}</TextLabel>
              <InputGroup sm>
                <Input
                  type="number"
                  name="endY"
                  value={endY}
                  step={step}
                  min={-1000}
                  onChange={actions.handleEndYChange}
                  onFocus={actions.handleInputFocus}
                  onBlur={actions.handleProbeAreaBlur}
                  disabled={isProbing}
                />
                <InputGroup.Append>
                  <InputGroup.Text>{toDisplayUnits(units)}</InputGroup.Text>
                </InputGroup.Append>
              </InputGroup>
              {validationErrors.endY && (
                <small style={{ color: '#a94442' }}>{validationErrors.endY}</small>
              )}
            </FormGroup>
          </Col>
        </Row>
        <Row>
          <Col>
            <FormGroup>
              <TextLabel mb="2x">
                {i18n._('Step X')}
                {' '}
                <Infotip
                  placement="top"
                  content={i18n._('The X spacing between probe points')}
                >
                  <i className="fa fa-info-circle text-muted" />
                </Infotip>
              </TextLabel>
              <InputGroup sm>
                <Input
                  type="number"
                  value={stepX}
                  step={step}
                  onChange={actions.handleStepXChange}
                  disabled={isProbing}
                />
                <InputGroup.Append>
                  <InputGroup.Text>{toDisplayUnits(units)}</InputGroup.Text>
                </InputGroup.Append>
              </InputGroup>
              {validationErrors.stepX && (
                <small style={{ color: '#a94442' }}>{validationErrors.stepX}</small>
              )}
            </FormGroup>
          </Col>
          <Col>
            <FormGroup>
              <TextLabel mb="2x">
                {i18n._('Step Y')}
                {' '}
                <Infotip
                  placement="top"
                  content={i18n._('The Y spacing between probe points')}
                >
                  <i className="fa fa-info-circle text-muted" />
                </Infotip>
              </TextLabel>
              <InputGroup sm>
                <Input
                  type="number"
                  value={stepY}
                  step={step}
                  onChange={actions.handleStepYChange}
                  disabled={isProbing}
                />
                <InputGroup.Append>
                  <InputGroup.Text>{toDisplayUnits(units)}</InputGroup.Text>
                </InputGroup.Append>
              </InputGroup>
              {validationErrors.stepY && (
                <small style={{ color: '#a94442' }}>{validationErrors.stepY}</small>
              )}
            </FormGroup>
          </Col>
        </Row>
      </div>
      <div className={styles.section}>
        {isProbing && probeProgress && (
          <div style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 8 }}>
              {i18n._('Probing progress: {{current}}/{{total}} points', { current: probeProgress.current, total: probeProgress.total })}
            </div>
            <ProgressBar
              variant="info"
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
