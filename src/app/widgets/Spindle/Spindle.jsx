import cx from 'classnames';
import ensureArray from 'ensure-array';
import get from 'lodash/get';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { Button, ButtonGroup } from 'app/components/Buttons';
import FontAwesomeIcon from 'app/components/FontAwesomeIcon';
import FormGroup from 'app/components/FormGroup';
import { Container, Row, Col } from 'app/components/GridSystem';
import Label from 'app/components/Label';
import Space from 'app/components/Space';
import Input from 'app/components/FormControl/Input';
import InputGroup from 'app/components/InputGroup';
import controller from 'app/lib/controller';
import i18n from 'app/lib/i18n';
import styles from './index.styl';

class Spindle extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    render() {
        const { state, actions } = this.props;
        const { canClick, spindleSpeed } = state;
        const spindle = get(state, 'controller.modal.spindle');
        const coolant = ensureArray(get(state, 'controller.modal.coolant'));
        const mistCoolant = coolant.indexOf('M7') >= 0;
        const floodCoolant = coolant.indexOf('M8') >= 0;

        return (
            <Container fluid>
                <Row>
                    <Col width={12}>
                        <FormGroup>
                            <Row>
                                <Label>
                                    {i18n._('Spindle control')}
                                </Label>
                            </Row>
                            <Row>
                                <ButtonGroup size="md">
                                    <Button
                                        btnStyle="default"
                                        disabled={!canClick}
                                        onClick={() => {
                                            if (spindleSpeed > 0) {
                                                controller.command('gcode', 'M3 S' + spindleSpeed);
                                            } else {
                                                controller.command('gcode', 'M3');
                                            }
                                        }}
                                        title={i18n._('Spindle On, CW (M3)', { ns: 'gcode' })}
                                    >
                                        <FontAwesomeIcon icon="redo-alt" spin={spindle === 'M3'} />
                                        <Space width={8} />
                                        M3
                                    </Button>
                                    <Button
                                        btnStyle="default"
                                        disabled={!canClick}
                                        onClick={() => {
                                            if (spindleSpeed > 0) {
                                                controller.command('gcode', 'M4 S' + spindleSpeed);
                                            } else {
                                                controller.command('gcode', 'M4');
                                            }
                                        }}
                                        title={i18n._('Spindle On, CCW (M4)', { ns: 'gcode' })}
                                    >
                                        <FontAwesomeIcon icon="undo-alt" className={cx({ [styles.spinReverse]: spindle === 'M4' })} />
                                        <Space width={8} />
                                        M4
                                    </Button>
                                    <Button
                                        btnStyle="default"
                                        disabled={!canClick}
                                        onClick={() => controller.command('gcode', 'M5')}
                                        title={i18n._('Spindle Off (M5)', { ns: 'gcode' })}
                                    >
                                        <FontAwesomeIcon icon="power-off" />
                                        <Space width={8} />
                                        M5
                                    </Button>
                                </ButtonGroup>
                            </Row>
                        </FormGroup>
                        <FormGroup>
                            <Label>
                                {i18n._('Spindle speed')}
                            </Label>
                            <InputGroup size="md">
                                <Input
                                    type="number"
                                    value={spindleSpeed}
                                    placeholder="0"
                                    min={0}
                                    step={1}
                                    onChange={actions.handleSpindleSpeedChange}
                                />
                                <InputGroup.Append>
                                    <InputGroup.Text>
                                        {i18n._('RPM')}
                                    </InputGroup.Text>
                                </InputGroup.Append>
                            </InputGroup>
                        </FormGroup>
                        <FormGroup>
                            <Row>
                                <Label>
                                    {i18n._('Coolant control')}
                                </Label>
                            </Row>
                            <Row>
                                <ButtonGroup btnSize="md">
                                    <Button
                                        btnStyle="default"
                                        disabled={!canClick}
                                        onClick={() => {
                                            controller.command('gcode', 'M7');
                                        }}
                                        title={i18n._('Mist Coolant On (M7)', { ns: 'gcode' })}
                                    >
                                        <i
                                            className={cx(
                                                styles.icon,
                                                styles.iconFan,
                                                { 'fa-spin': mistCoolant }
                                            )}
                                        />
                                        <Space width={8} />
                                        M7
                                    </Button>
                                    <Button
                                        btnStyle="default"
                                        disabled={!canClick}
                                        onClick={() => {
                                            controller.command('gcode', 'M8');
                                        }}
                                        title={i18n._('Flood Coolant On (M8)', { ns: 'gcode' })}
                                    >
                                        <i
                                            className={cx(
                                                styles.icon,
                                                styles.iconFan,
                                                { 'fa-spin': floodCoolant }
                                            )}
                                        />
                                        <Space width={8} />
                                        M8
                                    </Button>
                                    <Button
                                        btnStyle="default"
                                        disabled={!canClick}
                                        onClick={() => {
                                            controller.command('gcode', 'M9');
                                        }}
                                        title={i18n._('Coolant Off (M9)', { ns: 'gcode' })}
                                    >
                                        <FontAwesomeIcon icon="power-off" />
                                        <Space width={8} />
                                        M9
                                    </Button>
                                </ButtonGroup>
                            </Row>
                        </FormGroup>
                    </Col>
                </Row>
            </Container>
        );
    }
}

export default Spindle;
