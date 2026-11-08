import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Box,
  Button,
  ButtonGroup,
  Flex,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupAppend,
  Space,
  TextLabel,
} from '@tonic-ui/react';
import { ensureArray, ensurePositiveNumber } from 'ensure-type';
import _get from 'lodash/get';
import _includes from 'lodash/includes';
import React, { useState } from 'react';
import { connect } from 'react-redux';
import {
  CONNECTION_STATE_CONNECTED,
} from '@app/constants/connection';
import {
  MACHINE_STATE_NONE,
  REFORMED_MACHINE_STATE_IDLE,
  REFORMED_MACHINE_STATE_HOLD,
} from '@app/constants/controller';
import {
  WORKFLOW_STATE_RUNNING,
} from '@app/constants/workflow';
import controller from '@app/lib/controller';
import i18n from '@app/lib/i18n';
import useWidgetConfig from '@app/widgets/shared/useWidgetConfig';

/**
 * @param {{ isActionable: boolean, mistCoolant: boolean, floodCoolant: boolean, spindle: string }} props
 * @returns {JSX.Element}
 */
function Spindle({
  isActionable,
  mistCoolant,
  floodCoolant,
  spindle,
}) {
  const config = useWidgetConfig();
  const [speedDraft, setSpeedDraft] = useState(() => (
    String(ensurePositiveNumber(config.get('speed', 1000)))
  ));
  const isDisabled = !isActionable;
  const numericSpeed = speedDraft === '' ? null : Number(speedDraft);
  const hasValidSpeed = (
    numericSpeed !== null &&
    Number.isFinite(numericSpeed) &&
    numericSpeed >= 0
  );
  const sendSpindleCommand = command => {
    if (!hasValidSpeed) {
      return;
    }

    const payload = numericSpeed > 0 ? `${command} S${numericSpeed}` : command;
    controller.command('gcode', payload);
  };

  return (
    <Box width="100%">
      <Box mb="4x">
        <TextLabel mb="2x">
          {i18n._('Coolant')}
        </TextLabel>
        <Flex>
          <Box width="66.66666667%">
            <ButtonGroup
              size="sm"
              style={{ width: '100%' }}
            >
              <Button
                onClick={() => {
                  controller.command('gcode', 'M7');
                }}
                title={i18n._('Mist Coolant On (M7)', { ns: 'gcode' })}
                disabled={isDisabled}
              >
                <FontAwesomeIcon icon="fan" spin={mistCoolant} fixedWidth />
                <Space width="2x" />
                M7
              </Button>
              <Button
                onClick={() => {
                  controller.command('gcode', 'M8');
                }}
                title={i18n._('Flood Coolant On (M8)', { ns: 'gcode' })}
                disabled={isDisabled}
              >
                <FontAwesomeIcon icon="fan" spin={floodCoolant} fixedWidth />
                <Space width="2x" />
                M8
              </Button>
              <Button
                onClick={() => {
                  controller.command('gcode', 'M9');
                }}
                title={i18n._('Coolant Off (M9)', { ns: 'gcode' })}
                disabled={isDisabled}
              >
                <FontAwesomeIcon icon="power-off" fixedWidth />
                <Space width="2x" />
                M9
              </Button>
            </ButtonGroup>
          </Box>
        </Flex>
      </Box>
      <Box mb="4x">
        <TextLabel mb="2x">
          {i18n._('Spindle')}
        </TextLabel>
        <Flex>
          <Box width="66.66666667%">
            <ButtonGroup
              size="sm"
              style={{ width: '100%' }}
            >
              <Button
                disabled={isDisabled || !hasValidSpeed}
                onClick={() => sendSpindleCommand('M3')}
                title={i18n._('Spindle On, CW (M3)', { ns: 'gcode' })}
              >
                <FontAwesomeIcon icon="redo-alt" spin={spindle === 'M3'} fixedWidth />
                <Space width="2x" />
                M3
              </Button>
              <Button
                disabled={isDisabled || !hasValidSpeed}
                onClick={() => sendSpindleCommand('M4')}
                title={i18n._('Spindle On, CCW (M4)', { ns: 'gcode' })}
              >
                <FontAwesomeIcon icon="undo-alt" spinReverse={spindle === 'M4'} fixedWidth />
                <Space width="2x" />
                M4
              </Button>
              <Button
                onClick={() => controller.command('gcode', 'M5')}
                title={i18n._('Spindle Off (M5)', { ns: 'gcode' })}
                disabled={isDisabled}
              >
                <FontAwesomeIcon icon="power-off" fixedWidth />
                <Space width="2x" />
                M5
              </Button>
            </ButtonGroup>
          </Box>
        </Flex>
      </Box>
      <Box mb="4x">
        <TextLabel mb="2x">
          {i18n._('Spindle Speed')}
        </TextLabel>
        <Flex>
          <Box width="66.66666667%">
            <InputGroup>
              <Input
                aria-label={i18n._('Spindle Speed')}
                flex="1"
                minWidth="0"
                type="number"
                value={speedDraft}
                min={0}
                step={1}
                onChange={(event) => {
                  const value = event.target.value;
                  setSpeedDraft(value);
                  config.set('speed', ensurePositiveNumber(value));
                }}
              />
              <InputGroupAppend>
                <InputGroupAddon>{i18n._('RPM')}</InputGroupAddon>
              </InputGroupAppend>
            </InputGroup>
          </Box>
        </Flex>
      </Box>
    </Box>
  );
}

export default connect(store => {
  const isActionable = (() => {
    const connectionState = _get(store, 'connection.state');
    const isConnected = (connectionState === CONNECTION_STATE_CONNECTED);
    if (!isConnected) {
      return false;
    }

    const workflowState = _get(store, 'controller.workflow.state');
    const isWorkflowRunning = (workflowState === WORKFLOW_STATE_RUNNING);
    if (isWorkflowRunning) {
      return false;
    }

    const reformedMachineState = _get(store, 'controller.reformedMachineState');
    const expectedStates = [
      MACHINE_STATE_NONE, // No machine state reported (e.g. Marlin).
      REFORMED_MACHINE_STATE_IDLE,
      REFORMED_MACHINE_STATE_HOLD,
    ];
    const isExpectedState = _includes(expectedStates, reformedMachineState);
    return isExpectedState;
  })();
  const coolant = ensureArray(_get(store, 'controller.modal.coolant'));
  const spindle = _get(store, 'controller.modal.spindle');
  const mistCoolant = coolant.indexOf('M7') >= 0;
  const floodCoolant = coolant.indexOf('M8') >= 0;

  return {
    isActionable,
    mistCoolant,
    floodCoolant,
    spindle,
  };
})(Spindle);
