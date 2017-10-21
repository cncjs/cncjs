import _ from 'lodash';
import classNames from 'classnames';
import colornames from 'colornames';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import { Dropdown, MenuItem } from 'react-bootstrap';
import Detector from 'three/examples/js/Detector';
import controller from '../../lib/controller';
import Interpolate from '../../components/Interpolate';
import i18n from '../../lib/i18n';
import {
    // Units
    IMPERIAL_UNITS,
    METRIC_UNITS,
    // Grbl
    GRBL,
    GRBL_MACHINE_STATE_IDLE,
    GRBL_MACHINE_STATE_RUN,
    GRBL_MACHINE_STATE_HOLD,
    GRBL_MACHINE_STATE_DOOR,
    GRBL_MACHINE_STATE_HOME,
    GRBL_MACHINE_STATE_SLEEP,
    GRBL_MACHINE_STATE_ALARM,
    GRBL_MACHINE_STATE_CHECK,
    // Smoothie
    SMOOTHIE,
    SMOOTHIE_MACHINE_STATE_IDLE,
    SMOOTHIE_MACHINE_STATE_RUN,
    SMOOTHIE_MACHINE_STATE_HOLD,
    SMOOTHIE_MACHINE_STATE_DOOR,
    SMOOTHIE_MACHINE_STATE_HOME,
    SMOOTHIE_MACHINE_STATE_SLEEP,
    SMOOTHIE_MACHINE_STATE_ALARM,
    SMOOTHIE_MACHINE_STATE_CHECK,
    // TinyG
    TINYG,
    TINYG_MACHINE_STATE_INITIALIZING,
    TINYG_MACHINE_STATE_READY,
    TINYG_MACHINE_STATE_ALARM,
    TINYG_MACHINE_STATE_STOP,
    TINYG_MACHINE_STATE_END,
    TINYG_MACHINE_STATE_RUN,
    TINYG_MACHINE_STATE_HOLD,
    TINYG_MACHINE_STATE_PROBE,
    TINYG_MACHINE_STATE_CYCLE,
    TINYG_MACHINE_STATE_HOMING,
    TINYG_MACHINE_STATE_JOG,
    TINYG_MACHINE_STATE_INTERLOCK,
    TINYG_MACHINE_STATE_SHUTDOWN,
    TINYG_MACHINE_STATE_PANIC,
    // Workflow
    WORKFLOW_STATE_IDLE
} from '../../constants';
import styles from './primary-toolbar.styl';

class PrimaryToolbar extends PureComponent {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    canSendCommand() {
        if (!controller.connection.ident) {
            return false;
        }

        if (controller.workflow.state !== WORKFLOW_STATE_IDLE) {
            return false;
        }

        return true;
    }
    renderControllerType() {
        const { state } = this.props;
        const controllerType = state.controller.type;

        return (
            <div className={styles.controllerType}>
                {controllerType}
            </div>
        );
    }
    renderControllerState() {
        const { state } = this.props;
        const controllerType = state.controller.type;
        const controllerState = state.controller.state;
        let stateStyle = '';
        let stateText = '';

        if (controllerType === GRBL) {
            const machineState = _.get(controllerState, 'machineState');

            stateStyle = {
                [GRBL_MACHINE_STATE_IDLE]: 'controller-state-default',
                [GRBL_MACHINE_STATE_RUN]: 'controller-state-primary',
                [GRBL_MACHINE_STATE_HOLD]: 'controller-state-warning',
                [GRBL_MACHINE_STATE_DOOR]: 'controller-state-warning',
                [GRBL_MACHINE_STATE_HOME]: 'controller-state-primary',
                [GRBL_MACHINE_STATE_SLEEP]: 'controller-state-success',
                [GRBL_MACHINE_STATE_ALARM]: 'controller-state-danger',
                [GRBL_MACHINE_STATE_CHECK]: 'controller-state-info'
            }[machineState];

            stateText = {
                [GRBL_MACHINE_STATE_IDLE]: i18n.t('controller:Grbl.machineState.idle'),
                [GRBL_MACHINE_STATE_RUN]: i18n.t('controller:Grbl.machineState.run'),
                [GRBL_MACHINE_STATE_HOLD]: i18n.t('controller:Grbl.machineState.hold'),
                [GRBL_MACHINE_STATE_DOOR]: i18n.t('controller:Grbl.machineState.door'),
                [GRBL_MACHINE_STATE_HOME]: i18n.t('controller:Grbl.machineState.home'),
                [GRBL_MACHINE_STATE_SLEEP]: i18n.t('controller:Grbl.machineState.sleep'),
                [GRBL_MACHINE_STATE_ALARM]: i18n.t('controller:Grbl.machineState.alarm'),
                [GRBL_MACHINE_STATE_CHECK]: i18n.t('controller:Grbl.machineState.check')
            }[machineState];
        }

        if (controllerType === SMOOTHIE) {
            const machineState = _.get(controllerState, 'machineState');

            stateStyle = {
                [SMOOTHIE_MACHINE_STATE_IDLE]: 'controller-state-default',
                [SMOOTHIE_MACHINE_STATE_RUN]: 'controller-state-primary',
                [SMOOTHIE_MACHINE_STATE_HOLD]: 'controller-state-warning',
                [SMOOTHIE_MACHINE_STATE_DOOR]: 'controller-state-warning',
                [SMOOTHIE_MACHINE_STATE_HOME]: 'controller-state-primary',
                [SMOOTHIE_MACHINE_STATE_SLEEP]: 'controller-state-success',
                [SMOOTHIE_MACHINE_STATE_ALARM]: 'controller-state-danger',
                [SMOOTHIE_MACHINE_STATE_CHECK]: 'controller-state-info'
            }[machineState];

            stateText = {
                [SMOOTHIE_MACHINE_STATE_IDLE]: i18n.t('controller:Smoothie.machineState.idle'),
                [SMOOTHIE_MACHINE_STATE_RUN]: i18n.t('controller:Smoothie.machineState.run'),
                [SMOOTHIE_MACHINE_STATE_HOLD]: i18n.t('controller:Smoothie.machineState.hold'),
                [SMOOTHIE_MACHINE_STATE_DOOR]: i18n.t('controller:Smoothie.machineState.door'),
                [SMOOTHIE_MACHINE_STATE_HOME]: i18n.t('controller:Smoothie.machineState.home'),
                [SMOOTHIE_MACHINE_STATE_SLEEP]: i18n.t('controller:Smoothie.machineState.sleep'),
                [SMOOTHIE_MACHINE_STATE_ALARM]: i18n.t('controller:Smoothie.machineState.alarm'),
                [SMOOTHIE_MACHINE_STATE_CHECK]: i18n.t('controller:Smoothie.machineState.check')
            }[machineState];
        }

        if (controllerType === TINYG) {
            const machineState = _.get(controllerState, 'machineState');

            // https://github.com/synthetos/g2/wiki/Alarm-Processing
            stateStyle = {
                [TINYG_MACHINE_STATE_INITIALIZING]: 'controller-state-warning',
                [TINYG_MACHINE_STATE_READY]: 'controller-state-default',
                [TINYG_MACHINE_STATE_ALARM]: 'controller-state-danger',
                [TINYG_MACHINE_STATE_STOP]: 'controller-state-default',
                [TINYG_MACHINE_STATE_END]: 'controller-state-default',
                [TINYG_MACHINE_STATE_RUN]: 'controller-state-primary',
                [TINYG_MACHINE_STATE_HOLD]: 'controller-state-warning',
                [TINYG_MACHINE_STATE_PROBE]: 'controller-state-primary',
                [TINYG_MACHINE_STATE_CYCLE]: 'controller-state-primary',
                [TINYG_MACHINE_STATE_HOMING]: 'controller-state-primary',
                [TINYG_MACHINE_STATE_JOG]: 'controller-state-primary',
                [TINYG_MACHINE_STATE_INTERLOCK]: 'controller-state-warning',
                [TINYG_MACHINE_STATE_SHUTDOWN]: 'controller-state-danger',
                [TINYG_MACHINE_STATE_PANIC]: 'controller-state-danger'
            }[machineState];

            stateText = {
                [TINYG_MACHINE_STATE_INITIALIZING]: i18n.t('controller:TinyG.machineState.initializing'),
                [TINYG_MACHINE_STATE_READY]: i18n.t('controller:TinyG.machineState.ready'),
                [TINYG_MACHINE_STATE_ALARM]: i18n.t('controller:TinyG.machineState.alarm'),
                [TINYG_MACHINE_STATE_STOP]: i18n.t('controller:TinyG.machineState.stop'),
                [TINYG_MACHINE_STATE_END]: i18n.t('controller:TinyG.machineState.end'),
                [TINYG_MACHINE_STATE_RUN]: i18n.t('controller:TinyG.machineState.run'),
                [TINYG_MACHINE_STATE_HOLD]: i18n.t('controller:TinyG.machineState.hold'),
                [TINYG_MACHINE_STATE_PROBE]: i18n.t('controller:TinyG.machineState.probe'),
                [TINYG_MACHINE_STATE_CYCLE]: i18n.t('controller:TinyG.machineState.cycle'),
                [TINYG_MACHINE_STATE_HOMING]: i18n.t('controller:TinyG.machineState.homing'),
                [TINYG_MACHINE_STATE_JOG]: i18n.t('controller:TinyG.machineState.jog'),
                [TINYG_MACHINE_STATE_INTERLOCK]: i18n.t('controller:TinyG.machineState.interlock'),
                [TINYG_MACHINE_STATE_SHUTDOWN]: i18n.t('controller:TinyG.machineState.shutdown'),
                [TINYG_MACHINE_STATE_PANIC]: i18n.t('controller:TinyG.machineState.panic')
            }[machineState];
        }

        return (
            <div
                className={classNames(
                    styles.controllerState,
                    styles[stateStyle]
                )}
            >
                {stateText}
            </div>
        );
    }
    render() {
        const { state, actions } = this.props;
        const { units, wcs, disabled, gcode, projection, objects } = state;
        const controllerType = this.renderControllerType();
        const controllerState = this.renderControllerState();
        const canSendCommand = this.canSendCommand();
        const canToggleOptions = Detector.webgl && !disabled;

        return (
            <div>
                {controllerType}
                {controllerState}
                <div className={styles.dropdownGroup}>
                    <Dropdown
                        style={{ marginRight: 5 }}
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
                            <MenuItem header>{i18n._('Units')}</MenuItem>
                            <MenuItem
                                active={units === IMPERIAL_UNITS}
                                onSelect={() => {
                                    controller.command('gcode', 'G20');
                                }}
                            >
                                {i18n._('Inches (G20)')}
                            </MenuItem>
                            <MenuItem
                                active={units === METRIC_UNITS}
                                onSelect={() => {
                                    controller.command('gcode', 'G21');
                                }}
                            >
                                {i18n._('Millimeters (G21)')}
                            </MenuItem>
                        </Dropdown.Menu>
                    </Dropdown>
                    <Dropdown
                        style={{ marginRight: 5 }}
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
                                onSelect={() => {
                                    controller.command('gcode', 'G54');
                                }}
                            >
                                G54 (P1)
                            </MenuItem>
                            <MenuItem
                                active={wcs === 'G55'}
                                onSelect={() => {
                                    controller.command('gcode', 'G55');
                                }}
                            >
                                G55 (P2)
                            </MenuItem>
                            <MenuItem
                                active={wcs === 'G56'}
                                onSelect={() => {
                                    controller.command('gcode', 'G56');
                                }}
                            >
                                G56 (P3)
                            </MenuItem>
                            <MenuItem
                                active={wcs === 'G57'}
                                onSelect={() => {
                                    controller.command('gcode', 'G57');
                                }}
                            >
                                G57 (P4)
                            </MenuItem>
                            <MenuItem
                                active={wcs === 'G58'}
                                onSelect={() => {
                                    controller.command('gcode', 'G58');
                                }}
                            >
                                G58 (P5)
                            </MenuItem>
                            <MenuItem
                                active={wcs === 'G59'}
                                onSelect={() => {
                                    controller.command('gcode', 'G59');
                                }}
                            >
                                G59 (P6)
                            </MenuItem>
                        </Dropdown.Menu>
                    </Dropdown>
                    <Dropdown
                        bsSize="xs"
                        id="visualizer-dropdown"
                        pullRight
                    >
                        <button
                            type="button"
                            className="btn btn-default"
                            title={(!Detector.webgl || disabled)
                                ? i18n._('Enable 3D View')
                                : i18n._('Disable 3D View')
                            }
                            onClick={actions.toggle3DView}
                        >
                            {(!Detector.webgl || disabled)
                                ? <i className="fa fa-toggle-off" />
                                : <i className="fa fa-toggle-on" />
                            }
                            <span className="space" />
                            {i18n._('3D View')}
                        </button>
                        <Dropdown.Toggle
                            bsStyle="default"
                            noCaret
                        >
                            <i className="fa fa-caret-down" />
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                            <MenuItem
                                style={{ color: '#222' }}
                                header
                            >
                                <Interpolate
                                    format={'WebGL: {{status}}'}
                                    replacement={{
                                        status: Detector.webgl
                                            ? (<span style={{ color: colornames('royalblue') }}>{i18n._('Enabled')}</span>)
                                            : (<span style={{ color: colornames('crimson') }}>{i18n._('Disabled')}</span>)
                                    }}
                                />
                            </MenuItem>
                            <MenuItem divider />
                            <MenuItem header>
                                {i18n._('Projection')}
                            </MenuItem>
                            <MenuItem
                                disabled={!canToggleOptions}
                                onSelect={actions.toPerspectiveProjection}
                            >
                                <i className={classNames('fa', 'fa-fw', { 'fa-check': projection !== 'orthographic' })} />
                                <span className="space space-sm" />
                                {i18n._('Perspective Projection')}
                            </MenuItem>
                            <MenuItem
                                disabled={!canToggleOptions}
                                onSelect={actions.toOrthographicProjection}
                            >
                                <i className={classNames('fa', 'fa-fw', { 'fa-check': projection === 'orthographic' })} />
                                <span className="space space-sm" />
                                {i18n._('Orthographic Projection')}
                            </MenuItem>
                            <MenuItem divider />
                            <MenuItem header>
                                {i18n._('Scene Objects')}
                            </MenuItem>
                            <MenuItem
                                disabled={!canToggleOptions}
                                onSelect={actions.toggleGCodeFilename}
                            >
                                {gcode.displayName
                                    ? <i className="fa fa-toggle-on fa-fw" />
                                    : <i className="fa fa-toggle-off fa-fw" />
                                }
                                <span className="space space-sm" />
                                {i18n._('Display G-code Filename')}
                            </MenuItem>
                            <MenuItem
                                disabled={!canToggleOptions}
                                onSelect={actions.toggleCoordinateSystemVisibility}
                            >
                                {objects.coordinateSystem.visible
                                    ? <i className="fa fa-toggle-on fa-fw" />
                                    : <i className="fa fa-toggle-off fa-fw" />
                                }
                                <span className="space space-sm" />
                                {objects.coordinateSystem.visible
                                    ? i18n._('Hide Coordinate System')
                                    : i18n._('Show Coordinate System')
                                }
                            </MenuItem>
                            <MenuItem
                                disabled={!canToggleOptions}
                                onSelect={actions.toggleGridLineNumbersVisibility}
                            >
                                {objects.gridLineNumbers.visible
                                    ? <i className="fa fa-toggle-on fa-fw" />
                                    : <i className="fa fa-toggle-off fa-fw" />
                                }
                                <span className="space space-sm" />
                                {objects.gridLineNumbers.visible
                                    ? i18n._('Hide Grid Line Numbers')
                                    : i18n._('Show Grid Line Numbers')
                                }
                            </MenuItem>
                            <MenuItem
                                disabled={!canToggleOptions}
                                onSelect={actions.toggleToolheadVisibility}
                            >
                                {objects.toolhead.visible
                                    ? <i className="fa fa-toggle-on fa-fw" />
                                    : <i className="fa fa-toggle-off fa-fw" />
                                }
                                <span className="space space-sm" />
                                {objects.toolhead.visible
                                    ? i18n._('Hide Toolhead')
                                    : i18n._('Show Toolhead')
                                }
                            </MenuItem>
                        </Dropdown.Menu>
                    </Dropdown>
                </div>
            </div>
        );
    }
}

export default PrimaryToolbar;
