import ensureArray from 'ensure-array';
import get from 'lodash/get';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { Button, ButtonGroup } from 'app/components/Buttons';
import FontAwesomeIcon from 'app/components/FontAwesomeIcon';
import Input from 'app/components/FormControl/Input';
import FormGroup from 'app/components/FormGroup';
import { Container, Row, Col } from 'app/components/GridSystem';
import ImageIcon from 'app/components/ImageIcon';
import InputGroup from 'app/components/InputGroup';
import Label from 'app/components/Label';
import Space from 'app/components/Space';
import controller from 'app/lib/controller';
import i18n from 'app/lib/i18n';
import iconFan from './images/fan.svg';

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
                <FormGroup>
                    <Label>{i18n._('Spindle')}</Label>
                    <Row>
                        <Col width={8}>
                            <ButtonGroup
                                btnSize="sm"
                                btnStyle="default"
                                style={{ width: '100%' }}
                            >
                                <Button
                                    onClick={() => {
                                        if (spindleSpeed > 0) {
                                            controller.command('gcode', 'M3 S' + spindleSpeed);
                                        } else {
                                            controller.command('gcode', 'M3');
                                        }
                                    }}
                                    title={i18n._('Spindle On, CW (M3)', { ns: 'gcode' })}
                                    disabled={!canClick}
                                >
                                    <FontAwesomeIcon icon="redo-alt" spin={spindle === 'M3'} />
                                    <Space width={8} />
                                    M3
                                </Button>
                                <Button
                                    onClick={() => {
                                        if (spindleSpeed > 0) {
                                            controller.command('gcode', 'M4 S' + spindleSpeed);
                                        } else {
                                            controller.command('gcode', 'M4');
                                        }
                                    }}
                                    title={i18n._('Spindle On, CCW (M4)', { ns: 'gcode' })}
                                    disabled={!canClick}
                                >
                                    <FontAwesomeIcon icon="undo-alt" spinReverse={spindle === 'M4' } />
                                    <Space width={8} />
                                    M4
                                </Button>
                                <Button
                                    onClick={() => controller.command('gcode', 'M5')}
                                    title={i18n._('Spindle Off (M5)', { ns: 'gcode' })}
                                    disabled={!canClick}
                                >
                                    <FontAwesomeIcon icon="power-off" />
                                    <Space width={8} />
                                    M5
                                </Button>
                            </ButtonGroup>
                        </Col>
                    </Row>
                </FormGroup>
                <FormGroup>
                    <Label>{i18n._('Coolant')}</Label>
                    <Row>
                        <Col width={8}>
                            <ButtonGroup
                                btnSize="sm"
                                btnStyle="default"
                                style={{ width: '100%' }}
                            >
                                <Button
                                    onClick={() => {
                                        controller.command('gcode', 'M7');
                                    }}
                                    title={i18n._('Mist Coolant On (M7)', { ns: 'gcode' })}
                                    disabled={!canClick}
                                >
                                    <ImageIcon src={iconFan} spin={mistCoolant} style={{ width: '16px', height: '16px' }} />
                                    <Space width={8} />
                                    M7
                                </Button>
                                <Button
                                    onClick={() => {
                                        controller.command('gcode', 'M8');
                                    }}
                                    title={i18n._('Flood Coolant On (M8)', { ns: 'gcode' })}
                                    disabled={!canClick}
                                >
                                    <ImageIcon src={iconFan} spin={floodCoolant} style={{ width: '16px', height: '16px' }} />
                                    <Space width={8} />
                                    M8
                                </Button>
                                <Button
                                    onClick={() => {
                                        controller.command('gcode', 'M9');
                                    }}
                                    title={i18n._('Coolant Off (M9)', { ns: 'gcode' })}
                                    disabled={!canClick}
                                >
                                    <FontAwesomeIcon icon="power-off" />
                                    <Space width={8} />
                                    M9
                                </Button>
                            </ButtonGroup>
                        </Col>
                    </Row>
                </FormGroup>
                <FormGroup>
                    <Label>{i18n._('Spindle Speed')}</Label>
                    <Row>
                        <Col width={8}>
                            <InputGroup sm>
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
                        </Col>
                    </Row>
                </FormGroup>
            </Container>
        );
    }
}

export default Spindle;
