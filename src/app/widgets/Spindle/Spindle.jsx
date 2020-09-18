import ensureArray from 'ensure-array';
import _get from 'lodash/get';
import _includes from 'lodash/includes';
import React from 'react';
import { connect } from 'react-redux';
import { Form, Field } from 'react-final-form';
import { Button, ButtonGroup } from 'app/components/Buttons';
import FontAwesomeIcon from 'app/components/FontAwesomeIcon';
import Input from 'app/components/FormControl/Input';
import FormGroup from 'app/components/FormGroup';
import { Container, Row, Col } from 'app/components/GridSystem';
import ImageIcon from 'app/components/ImageIcon';
import InputGroup from 'app/components/InputGroup';
import Label from 'app/components/Label';
import Space from 'app/components/Space';
import {
  CONNECTION_STATE_CONNECTED,
} from 'app/constants/connection';
import {
  MACHINE_STATE_NONE,
  REFORMED_MACHINE_STATE_IDLE,
  REFORMED_MACHINE_STATE_HOLD,
} from 'app/constants/controller';
import {
  WORKFLOW_STATE_RUNNING,
} from 'app/constants/workflow';
import controller from 'app/lib/controller';
import { ensurePositiveNumber } from 'app/lib/ensure-type';
import i18n from 'app/lib/i18n';
import useWidgetConfig from 'app/widgets/shared/useWidgetConfig';
import iconFan from './images/fan.svg';

const Spindle = ({
  isActionable,
  mistCoolant,
  floodCoolant,
  spindle,
}) => {
  const config = useWidgetConfig();
  const initialValues = {
    speed: ensurePositiveNumber(config.get('speed', 1000)),
  };
  const isDisabled = !isActionable;

  return (
    <Form
      initialValues={initialValues}
      onSubmit={(values) => {
        // No submit handler required
      }}
      subscription={{}}
    >
      {({ form }) => (
        <Container fluid>
          <FormGroup>
            <Label>{i18n._('Coolant')}</Label>
            <Row>
              <Col width={8}>
                <ButtonGroup
                  sm
                  style={{ width: '100%' }}
                >
                  <Button
                    onClick={() => {
                      controller.command('gcode', 'M7');
                    }}
                    title={i18n._('Mist Coolant On (M7)', { ns: 'gcode' })}
                    disabled={isDisabled}
                  >
                    <ImageIcon
                      src={iconFan}
                      spin={mistCoolant}
                      style={{
                        width: '16px',
                        height: '16px',
                      }}
                    />
                    <Space width={8} />
                    M7
                  </Button>
                  <Button
                    onClick={() => {
                      controller.command('gcode', 'M8');
                    }}
                    title={i18n._('Flood Coolant On (M8)', { ns: 'gcode' })}
                    disabled={isDisabled}
                  >
                    <ImageIcon
                      src={iconFan}
                      spin={floodCoolant}
                      style={{
                        width: '16px',
                        height: '16px',
                      }}
                    />
                    <Space width={8} />
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
                    <Space width={8} />
                    M9
                  </Button>
                </ButtonGroup>
              </Col>
            </Row>
          </FormGroup>
          <FormGroup>
            <Label>{i18n._('Spindle')}</Label>
            <Row>
              <Col width={8}>
                <Field name="speed">
                  {({ input }) => {
                    const invalidSpeed = !Number.isFinite(input.value);
                    const isM3Disabled = isDisabled || invalidSpeed;
                    const isM4Disabled = isDisabled || invalidSpeed;

                    return (
                      <ButtonGroup
                        sm
                        style={{ width: '100%' }}
                      >
                        <Button
                          disabled={isM3Disabled}
                          onClick={() => {
                            const speed = config.get('speed');
                            if (speed > 0) {
                              controller.command('gcode', 'M3 S' + speed);
                            } else {
                              controller.command('gcode', 'M3');
                            }
                          }}
                          title={i18n._('Spindle On, CW (M3)', { ns: 'gcode' })}
                        >
                          <FontAwesomeIcon icon="redo-alt" spin={spindle === 'M3'} fixedWidth />
                          <Space width={8} />
                          M3
                        </Button>
                        <Button
                          disabled={isM4Disabled}
                          onClick={() => {
                            const speed = config.get('speed');
                            if (speed > 0) {
                              controller.command('gcode', 'M4 S' + speed);
                            } else {
                              controller.command('gcode', 'M4');
                            }
                          }}
                          title={i18n._('Spindle On, CCW (M4)', { ns: 'gcode' })}
                        >
                          <FontAwesomeIcon icon="undo-alt" spinReverse={spindle === 'M4'} fixedWidth />
                          <Space width={8} />
                          M4
                        </Button>
                        <Button
                          onClick={() => controller.command('gcode', 'M5')}
                          title={i18n._('Spindle Off (M5)', { ns: 'gcode' })}
                          disabled={isDisabled}
                        >
                          <FontAwesomeIcon icon="power-off" fixedWidth />
                          <Space width={8} />
                          M5
                        </Button>
                      </ButtonGroup>
                    );
                  }}
                </Field>
              </Col>
            </Row>
          </FormGroup>
          <FormGroup>
            <Label>{i18n._('Spindle Speed')}</Label>
            <Row>
              <Col width={8}>
                <Field name="speed">
                  {({ input, meta }) => (
                    <>
                      <InputGroup sm>
                        <Input
                          type="number"
                          value={input.value}
                          min={0}
                          step={1}
                          onChange={(event) => {
                            const value = event.target.value;
                            input.onChange(value);

                            const speed = ensurePositiveNumber(value);
                            config.set('speed', speed);
                          }}
                        />
                        <InputGroup.Append>
                          <InputGroup.Text>
                            {i18n._('RPM')}
                          </InputGroup.Text>
                        </InputGroup.Append>
                      </InputGroup>
                    </>
                  )}
                </Field>
              </Col>
            </Row>
          </FormGroup>
        </Container>
      )}
    </Form>
  );
};

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
