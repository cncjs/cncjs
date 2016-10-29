import _ from 'lodash';
import React, { Component, PropTypes } from 'react';
import { Dropdown, MenuItem } from 'react-bootstrap';
import CSSModules from 'react-css-modules';
import controller from '../../lib/controller';
import i18n from '../../lib/i18n';
import {
    // Units
    IMPERIAL_UNITS,
    METRIC_UNITS,
    // Grbl
    GRBL,
    GRBL_ACTIVE_STATE_IDLE,
    GRBL_ACTIVE_STATE_RUN,
    GRBL_ACTIVE_STATE_HOLD,
    GRBL_ACTIVE_STATE_DOOR,
    GRBL_ACTIVE_STATE_HOME,
    GRBL_ACTIVE_STATE_ALARM,
    GRBL_ACTIVE_STATE_CHECK,
    // TinyG2
    TINYG2,
    TINYG2_MACHINE_STATE_INIT,
    TINYG2_MACHINE_STATE_READY,
    TINYG2_MACHINE_STATE_ALARM,
    TINYG2_MACHINE_STATE_STOP,
    TINYG2_MACHINE_STATE_END,
    TINYG2_MACHINE_STATE_RUN,
    TINYG2_MACHINE_STATE_HOLD,
    TINYG2_MACHINE_STATE_PROBE,
    TINYG2_MACHINE_STATE_CYCLING,
    TINYG2_MACHINE_STATE_HOMING,
    TINYG2_MACHINE_STATE_JOGGING,
    TINYG2_MACHINE_STATE_SHUTDOWN,
    // Workflow
    WORKFLOW_STATE_IDLE
} from '../../constants';
import styles from './index.styl';

@CSSModules(styles, { allowMultiple: true })
class Controls extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    canSendCommand() {
        const { state } = this.props;
        const { port, controller, workflowState } = state;

        if (!port) {
            return false;
        }
        if (!controller.type || !controller.state) {
            return false;
        }
        if (workflowState !== WORKFLOW_STATE_IDLE) {
            return false;
        }

        return true;
    }
    getControllerState() {
        const { state } = this.props;
        const controllerType = state.controller.type;
        const controllerState = state.controller.state;

        if (controllerType === GRBL) {
            const activeState = _.get(controllerState, 'status.activeState');
            const stateText = {
                [GRBL_ACTIVE_STATE_IDLE]: i18n.t('controller:Grbl.activeState.idle'),
                [GRBL_ACTIVE_STATE_RUN]: i18n.t('controller:Grbl.activeState.run'),
                [GRBL_ACTIVE_STATE_HOLD]: i18n.t('controller:Grbl.activeState.hold'),
                [GRBL_ACTIVE_STATE_DOOR]: i18n.t('controller:Grbl.activeState.door'),
                [GRBL_ACTIVE_STATE_HOME]: i18n.t('controller:Grbl.activeState.home'),
                [GRBL_ACTIVE_STATE_ALARM]: i18n.t('controller:Grbl.activeState.alarm'),
                [GRBL_ACTIVE_STATE_CHECK]: i18n.t('controller:Grbl.activeState.check')
            }[activeState];

            return stateText;
        }

        if (controllerType === TINYG2) {
            const machineState = _.get(controllerState, 'sr.machineState');
            const stateText = {
                [TINYG2_MACHINE_STATE_INIT]: i18n.t('controller:TinyG2.machineState.init'),
                [TINYG2_MACHINE_STATE_READY]: i18n.t('controller:TinyG2.machineState.ready'),
                [TINYG2_MACHINE_STATE_ALARM]: i18n.t('controller:TinyG2.machineState.alarm'),
                [TINYG2_MACHINE_STATE_STOP]: i18n.t('controller:TinyG2.machineState.stop'),
                [TINYG2_MACHINE_STATE_END]: i18n.t('controller:TinyG2.machineState.end'),
                [TINYG2_MACHINE_STATE_RUN]: i18n.t('controller:TinyG2.machineState.run'),
                [TINYG2_MACHINE_STATE_HOLD]: i18n.t('controller:TinyG2.machineState.hold'),
                [TINYG2_MACHINE_STATE_PROBE]: i18n.t('controller:TinyG2.machineState.probe'),
                [TINYG2_MACHINE_STATE_CYCLING]: i18n.t('controller:TinyG2.machineState.cycling'),
                [TINYG2_MACHINE_STATE_HOMING]: i18n.t('controller:TinyG2.machineState.homing'),
                [TINYG2_MACHINE_STATE_JOGGING]: i18n.t('controller:TinyG2.machineState.jogging'),
                [TINYG2_MACHINE_STATE_SHUTDOWN]: i18n.t('controller:TinyG2.machineState.shutdown')
            }[machineState];

            return stateText;
        }

        return '';
    }
    getWorkCoordinateSystem() {
        const { state } = this.props;
        const controllerType = state.controller.type;
        const controllerState = state.controller.state;
        const defaultWCS = 'G54';

        if (controllerType === GRBL) {
            return _.get(controllerState, 'parserstate.modal.coordinate', defaultWCS);
        }

        if (controllerType === TINYG2) {
            return _.get(controllerState, 'sr.modal.coordinate', defaultWCS);
        }

        return defaultWCS;
    }
    render() {
        const { state, actions } = this.props;
        const { units, webgl } = state;
        const controllerType = state.controller.type;
        const controllerState = this.getControllerState();
        const canSendCommand = this.canSendCommand();
        const wcs = this.getWorkCoordinateSystem();

        return (
            <div>
                {controllerType &&
                <div styleName="controller-type">
                    {controllerType}
                </div>
                }
                {controllerState &&
                <div styleName="controller-state">
                    {controllerState}
                </div>
                }
                <div className="pull-right">
                    <Dropdown
                        style={{
                            marginBottom: 2,
                            marginRight: 5
                        }}
                        bsSize="xs"
                        id="units-dropdown"
                        disabled={!canSendCommand}
                        pullRight
                    >
                        <Dropdown.Toggle
                            title={i18n._('Units')}
                            style={{ minWidth: 50 }}
                        >
                            {units === IMPERIAL_UNITS && i18n._('in')}
                            {units === METRIC_UNITS && i18n._('mm')}
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                            <MenuItem
                                active={units === IMPERIAL_UNITS}
                                onClick={() => {
                                    controller.command('gcode', 'G20');
                                }}
                            >
                                {i18n._('Inches (G20)')}
                            </MenuItem>
                            <MenuItem
                                active={units === METRIC_UNITS}
                                onClick={() => {
                                    controller.command('gcode', 'G21');
                                }}
                            >
                                {i18n._('Millimeters (G21)')}
                            </MenuItem>
                        </Dropdown.Menu>
                    </Dropdown>
                    <Dropdown
                        style={{
                            marginBottom: 2,
                            marginRight: 5
                        }}
                        bsSize="xs"
                        id="wcs-dropdown"
                        disabled={!canSendCommand}
                        pullRight
                    >
                        <Dropdown.Toggle
                            title={i18n._('Work Coordinate System')}
                            style={{ minWidth: 50 }}
                        >
                            {wcs}
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                            <MenuItem header>{i18n._('Work Coordinate System')}</MenuItem>
                            <MenuItem
                                active={wcs === 'G54'}
                                onClick={() => {
                                    controller.command('gcode', 'G54');
                                }}
                            >
                                G54 (P1)
                            </MenuItem>
                            <MenuItem
                                active={wcs === 'G55'}
                                onClick={() => {
                                    controller.command('gcode', 'G55');
                                }}
                            >
                                G55 (P2)
                            </MenuItem>
                            <MenuItem
                                active={wcs === 'G56'}
                                onClick={() => {
                                    controller.command('gcode', 'G56');
                                }}
                            >
                                G56 (P3)
                            </MenuItem>
                            <MenuItem
                                active={wcs === 'G57'}
                                onClick={() => {
                                    controller.command('gcode', 'G57');
                                }}
                            >
                                G57 (P4)
                            </MenuItem>
                            <MenuItem
                                active={wcs === 'G58'}
                                onClick={() => {
                                    controller.command('gcode', 'G58');
                                }}
                            >
                                G58 (P5)
                            </MenuItem>
                            <MenuItem
                                active={wcs === 'G59'}
                                onClick={() => {
                                    controller.command('gcode', 'G59');
                                }}
                            >
                                G59 (P6)
                            </MenuItem>
                        </Dropdown.Menu>
                    </Dropdown>
                    <Dropdown
                        style={{
                            marginBottom: 2,
                            marginRight: 0
                        }}
                        bsSize="xs"
                        id="visualizer-dropdown"
                        disabled={!webgl}
                        pullRight
                    >
                        <Dropdown.Toggle
                            style={{ minWidth: 50 }}
                        >
                            <i className="fa fa-cube" />
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                            <MenuItem header>{i18n._('Options')}</MenuItem>
                            <MenuItem
                                onClick={(event) => {
                                    actions.toggleRenderAnimation();
                                }}
                            >
                                {state.renderAnimation
                                    ? <i className="fa fa-toggle-on" />
                                    : <i className="fa fa-toggle-off" />
                                }
                                &nbsp;
                                {i18n._('Toggle Toolhead Animation')}
                            </MenuItem>
                        </Dropdown.Menu>
                    </Dropdown>
                </div>
            </div>
        );
    }
}

export default Controls;
