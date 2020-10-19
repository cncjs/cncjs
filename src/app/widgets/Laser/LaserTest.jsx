import {
  Text,
} from '@trendmicro/react-styled-ui';
import { ensurePositiveNumber } from 'ensure-type';
import _get from 'lodash/get';
import React from 'react';
import { Form, Field, FormSpy } from 'react-final-form';
import { connect } from 'react-redux';
import Slider from 'rc-slider';
import { Button } from 'app/components/Buttons';
import CollapsibleCard from 'app/components/CollapsibleCard';
import Input from 'app/components/FormControl/Input';
import FormGroup from 'app/components/FormGroup';
import { Container, Row, Col } from 'app/components/GridSystem';
import HorizontalForm from 'app/components/HorizontalForm';
import InputGroup from 'app/components/InputGroup';
import {
  CONNECTION_STATE_CONNECTED,
} from 'app/constants/connection';
import controller from 'app/lib/controller';
import i18n from 'app/lib/i18n';
import useWidgetConfig from 'app/widgets/shared/useWidgetConfig';
import OverflowEllipsis from './components/OverflowEllipsis';

const LaserTest = ({
  isConnected,
}) => {
  const config = useWidgetConfig();
  const initialValues = {
    test: {
      power: ensurePositiveNumber(config.get('test.power', 0)),
      duration: ensurePositiveNumber(config.get('test.duration', 0)),
      maxS: ensurePositiveNumber(config.get('test.maxS', 1000)),
    },
  };
  const expanded = config.get('panel.laserTest.expanded');
  const collapsed = !expanded;

  return (
    <CollapsibleCard
      easing="ease-out"
      collapsed={collapsed}
    >
      {({ collapsed, ToggleIcon, Header, Body }) => {
        const expanded = !collapsed;
        config.set('panel.laserTest.expanded', expanded);

        return (
          <Container fluid style={{ width: '100%' }}>
            <Header>
              {({ hovered }) => (
                <Row>
                  <Col>{i18n._('Laser Test')}</Col>
                  <Col width="auto">
                    <ToggleIcon style={{ opacity: hovered ? 1 : 0.5 }} />
                  </Col>
                </Row>
              )}
            </Header>
            <Body>
              <Form
                initialValues={initialValues}
                onSubmit={(values) => {
                  // No submit handler required
                }}
                subscription={{}}
              >
                {({ form }) => (
                  <>
                    <FormGroup>
                      <HorizontalForm spacing={['.75rem', '.75rem']}>
                        {({ FormContainer, FormRow, FormCol }) => (
                          <FormContainer>
                            <FormRow>
                              <FormCol>
                                <OverflowEllipsis title={i18n._('Power (%)')}>
                                  {i18n._('Power (%)')}
                                </OverflowEllipsis>
                              </FormCol>
                              <FormCol style={{ wordBreak: 'break-all', textAlign: 'center' }}>
                                <Field name="test.power">
                                  {({ input, meta }) => (
                                    <>
                                      <Text>{input.value}%</Text>
                                      <Slider
                                        style={{ padding: 0 }}
                                        value={input.value}
                                        min={0}
                                        max={100}
                                        step={1}
                                        onChange={(value) => {
                                          input.onChange(value);

                                          const power = ensurePositiveNumber(value);
                                          config.set('test.power', power);
                                        }}
                                      />
                                    </>
                                  )}
                                </Field>
                              </FormCol>
                            </FormRow>
                            <FormRow>
                              <FormCol>
                                <OverflowEllipsis title={i18n._('Test duration')}>
                                  {i18n._('Test duration')}
                                </OverflowEllipsis>
                              </FormCol>
                              <FormCol style={{ wordBreak: 'break-all' }}>
                                <Field name="test.duration">
                                  {({ input, meta }) => (
                                    <InputGroup sm>
                                      <Input
                                        type="number"
                                        value={input.value}
                                        min={0}
                                        step={1}
                                        onChange={(event) => {
                                          const value = event.target.value;
                                          input.onChange(value);

                                          const duration = ensurePositiveNumber(value);
                                          config.set('test.duration', duration);
                                        }}
                                      />
                                      <InputGroup.Append>
                                        <InputGroup.Text>
                                          {i18n._('ms')}
                                        </InputGroup.Text>
                                      </InputGroup.Append>
                                    </InputGroup>
                                  )}
                                </Field>
                              </FormCol>
                            </FormRow>
                            <FormRow>
                              <FormCol>
                                <OverflowEllipsis title={i18n._('Maximum value')}>
                                  {i18n._('Maximum value')}
                                </OverflowEllipsis>
                              </FormCol>
                              <FormCol style={{ wordBreak: 'break-all' }}>
                                <Field name="test.maxS">
                                  {({ input, meta }) => (
                                    <InputGroup sm>
                                      <InputGroup.Prepend>
                                        <InputGroup.Text>
                                          S
                                        </InputGroup.Text>
                                      </InputGroup.Prepend>
                                      <Input
                                        type="number"
                                        value={input.value}
                                        min={0}
                                        step={1}
                                        onChange={(event) => {
                                          const value = event.target.value;
                                          input.onChange(value);

                                          const maxS = ensurePositiveNumber(value);
                                          config.set('test.maxS', maxS);
                                        }}
                                      />
                                    </InputGroup>
                                  )}
                                </Field>
                              </FormCol>
                            </FormRow>
                          </FormContainer>
                        )}
                      </HorizontalForm>
                    </FormGroup>
                    <FormSpy
                      subscription={{
                        values: true,
                        invalid: true,
                      }}
                    >
                      {({ values, invalid }) => {
                        const power = _get(values, 'test.power');
                        const duration = _get(values, 'test.duration');
                        const maxS = _get(values, 'test.maxS');

                        const isLaserTestReady = (() => {
                          if (!isConnected) {
                            return false;
                          }

                          if (invalid) {
                            return false;
                          }

                          if (!Number.isFinite(power)) {
                            return false;
                          }

                          if (!Number.isFinite(duration)) {
                            return false;
                          }

                          if (!Number.isFinite(maxS)) {
                            return false;
                          }

                          return true;
                        })();

                        const turnLaserTestOn = () => {
                          controller.command('lasertest', power, duration, maxS);
                        };

                        const turnLaserTestOff = () => {
                          controller.command('lasertest', 0);
                        };

                        return (
                          <div>
                            <Button
                              sm
                              disabled={!isLaserTestReady}
                              onClick={turnLaserTestOn}
                            >
                              {i18n._('Laser Test')}
                            </Button>
                            <Button
                              sm
                              disabled={!isConnected}
                              onClick={turnLaserTestOff}
                            >
                              {i18n._('Laser Off')}
                            </Button>
                          </div>
                        );
                      }}
                    </FormSpy>
                  </>
                )}
              </Form>
            </Body>
          </Container>
        );
      }}
    </CollapsibleCard>
  );
};

export default connect(store => {
  const connectionState = _get(store, 'connection.state');
  const isConnected = (connectionState === CONNECTION_STATE_CONNECTED);

  return {
    isConnected,
  };
})(LaserTest);
