import _ from 'lodash';
import classNames from 'classnames';
import colornames from 'colornames';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import { Button } from 'app/components/Buttons';
import Dropdown, { MenuItem } from 'app/components/Dropdown';
import I18n from 'app/components/I18n';
import Space from 'app/components/Space';
import controller from 'app/lib/controller';
import i18n from 'app/lib/i18n';
import * as WebGL from 'app/lib/three/WebGL';
import {
    // Grbl
    GRBL,
    GRBL_ACTIVE_STATE_IDLE,
    GRBL_ACTIVE_STATE_RUN,
    GRBL_ACTIVE_STATE_HOLD,
    GRBL_ACTIVE_STATE_DOOR,
    GRBL_ACTIVE_STATE_HOME,
    GRBL_ACTIVE_STATE_SLEEP,
    GRBL_ACTIVE_STATE_ALARM,
    GRBL_ACTIVE_STATE_CHECK,
    // Marlin
    MARLIN,
    // Smoothie
    SMOOTHIE,
    SMOOTHIE_ACTIVE_STATE_IDLE,
    SMOOTHIE_ACTIVE_STATE_RUN,
    SMOOTHIE_ACTIVE_STATE_HOLD,
    SMOOTHIE_ACTIVE_STATE_DOOR,
    SMOOTHIE_ACTIVE_STATE_HOME,
    SMOOTHIE_ACTIVE_STATE_ALARM,
    SMOOTHIE_ACTIVE_STATE_CHECK,
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
} from 'app/constants';
import styles from './index.styl';

class PrimaryToolbar extends PureComponent {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    canSendCommand() {
        const { state } = this.props;
        const { port, controller, workflow } = state;

        if (!port) {
            return false;
        }
        if (!controller.type || !controller.state) {
            return false;
        }
        if (workflow.state !== WORKFLOW_STATE_IDLE) {
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
            const activeState = _.get(controllerState, 'status.activeState');

            stateStyle = {
                [GRBL_ACTIVE_STATE_IDLE]: 'controller-state-default',
                [GRBL_ACTIVE_STATE_RUN]: 'controller-state-primary',
                [GRBL_ACTIVE_STATE_HOLD]: 'controller-state-warning',
                [GRBL_ACTIVE_STATE_DOOR]: 'controller-state-warning',
                [GRBL_ACTIVE_STATE_HOME]: 'controller-state-primary',
                [GRBL_ACTIVE_STATE_SLEEP]: 'controller-state-success',
                [GRBL_ACTIVE_STATE_ALARM]: 'controller-state-danger',
                [GRBL_ACTIVE_STATE_CHECK]: 'controller-state-info'
            }[activeState];

            stateText = {
                [GRBL_ACTIVE_STATE_IDLE]: i18n.t('controller:Grbl.activeState.idle'),
                [GRBL_ACTIVE_STATE_RUN]: i18n.t('controller:Grbl.activeState.run'),
                [GRBL_ACTIVE_STATE_HOLD]: i18n.t('controller:Grbl.activeState.hold'),
                [GRBL_ACTIVE_STATE_DOOR]: i18n.t('controller:Grbl.activeState.door'),
                [GRBL_ACTIVE_STATE_HOME]: i18n.t('controller:Grbl.activeState.home'),
                [GRBL_ACTIVE_STATE_SLEEP]: i18n.t('controller:Grbl.activeState.sleep'),
                [GRBL_ACTIVE_STATE_ALARM]: i18n.t('controller:Grbl.activeState.alarm'),
                [GRBL_ACTIVE_STATE_CHECK]: i18n.t('controller:Grbl.activeState.check')
            }[activeState];
        }

        if (controllerType === MARLIN) {
            // Marlin does not have machine state
        }

        if (controllerType === SMOOTHIE) {
            const activeState = _.get(controllerState, 'status.activeState');

            stateStyle = {
                [SMOOTHIE_ACTIVE_STATE_IDLE]: 'controller-state-default',
                [SMOOTHIE_ACTIVE_STATE_RUN]: 'controller-state-primary',
                [SMOOTHIE_ACTIVE_STATE_HOLD]: 'controller-state-warning',
                [SMOOTHIE_ACTIVE_STATE_DOOR]: 'controller-state-warning',
                [SMOOTHIE_ACTIVE_STATE_HOME]: 'controller-state-primary',
                [SMOOTHIE_ACTIVE_STATE_ALARM]: 'controller-state-danger',
                [SMOOTHIE_ACTIVE_STATE_CHECK]: 'controller-state-info'
            }[activeState];

            stateText = {
                [SMOOTHIE_ACTIVE_STATE_IDLE]: i18n.t('controller:Smoothie.activeState.idle'),
                [SMOOTHIE_ACTIVE_STATE_RUN]: i18n.t('controller:Smoothie.activeState.run'),
                [SMOOTHIE_ACTIVE_STATE_HOLD]: i18n.t('controller:Smoothie.activeState.hold'),
                [SMOOTHIE_ACTIVE_STATE_DOOR]: i18n.t('controller:Smoothie.activeState.door'),
                [SMOOTHIE_ACTIVE_STATE_HOME]: i18n.t('controller:Smoothie.activeState.home'),
                [SMOOTHIE_ACTIVE_STATE_ALARM]: i18n.t('controller:Smoothie.activeState.alarm'),
                [SMOOTHIE_ACTIVE_STATE_CHECK]: i18n.t('controller:Smoothie.activeState.check')
            }[activeState];
        }

        if (controllerType === TINYG) {
            const machineState = _.get(controllerState, 'sr.machineState');

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

    getWorkCoordinateSystem() {
        const { state } = this.props;
        const controllerType = state.controller.type;
        const controllerState = state.controller.state;
        const defaultWCS = 'G54';

        if (controllerType === GRBL) {
            return _.get(controllerState, 'parserstate.modal.wcs') || defaultWCS;
        }

        if (controllerType === MARLIN) {
            return _.get(controllerState, 'modal.wcs') || defaultWCS;
        }

        if (controllerType === SMOOTHIE) {
            return _.get(controllerState, 'parserstate.modal.wcs') || defaultWCS;
        }

        if (controllerType === TINYG) {
            return _.get(controllerState, 'sr.modal.wcs') || defaultWCS;
        }

        return defaultWCS;
    }

    render() {
        const { state, actions } = this.props;
        const { disabled, gcode, projection, objects } = state;
        const canSendCommand = this.canSendCommand();
        const canToggleOptions = WebGL.isWebGLAvailable() && !disabled;
        const wcs = this.getWorkCoordinateSystem();

        return (
            <div className={styles.primaryToolbar}>
                {this.renderControllerType()}
                {this.renderControllerState()}
                <div className="pull-right">
                    <Dropdown
                        style={{ marginRight: 5 }}
                        disabled={!canSendCommand}
                        pullRight
                    >
                        <Dropdown.Toggle
                            btnSize="sm"
                            title={i18n._('Work Coordinate System')}
                        >
                            {wcs === 'G54' && `${wcs} (P1)`}
                            {wcs === 'G55' && `${wcs} (P2)`}
                            {wcs === 'G56' && `${wcs} (P3)`}
                            {wcs === 'G57' && `${wcs} (P4)`}
                            {wcs === 'G58' && `${wcs} (P5)`}
                            {wcs === 'G59' && `${wcs} (P6)`}
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
                        pullRight
                    >
                        <Button
                            btnSize="sm"
                            btnStyle="flat"
                            title={(!WebGL.isWebGLAvailable() || disabled)
                                ? i18n._('Enable 3D View')
                                : i18n._('Disable 3D View')
                            }
                            onClick={actions.toggle3DView}
                        >
                            {(!WebGL.isWebGLAvailable() || disabled)
                                ? <i className="fa fa-toggle-off" />
                                : <i className="fa fa-toggle-on" />
                            }
                            {i18n._('3D View')}
                        </Button>
                        <Dropdown.Toggle btnSize="sm" />
                        <Dropdown.Menu>
                            <MenuItem
                                style={{ color: '#222' }}
                                header
                            >
                                {WebGL.isWebGLAvailable() && (
                                    <I18n>
                                        {'WebGL: '}
                                        <span style={{ color: colornames('royalblue') }}>
                                        Enabled
                                        </span>
                                    </I18n>
                                )}
                                {!WebGL.isWebGLAvailable() && (
                                    <I18n>
                                        {'WebGL: '}
                                        <span style={{ color: colornames('crimson') }}>
                                        Disabled
                                        </span>
                                    </I18n>
                                )}
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
                                <Space width={8} />
                                {i18n._('Perspective Projection')}
                            </MenuItem>
                            <MenuItem
                                disabled={!canToggleOptions}
                                onSelect={actions.toOrthographicProjection}
                            >
                                <i className={classNames('fa', 'fa-fw', { 'fa-check': projection === 'orthographic' })} />
                                <Space width={8} />
                                {i18n._('Orthographic Projection')}
                            </MenuItem>
                            <MenuItem divider />
                            <MenuItem
                                disabled={!canToggleOptions}
                                onSelect={actions.toggleGCodeMessage}
                            >
                                {gcode.displayMessage
                                    ? <i className="fa fa-toggle-on fa-fw" />
                                    : <i className="fa fa-toggle-off fa-fw" />
                                }
                                <Space width={8} />
                                {i18n._('Display G-code Messages')}
                            </MenuItem>
                            <MenuItem
                                disabled={!canToggleOptions}
                                onSelect={actions.toggleGCodeFilename}
                            >
                                {gcode.displayName
                                    ? <i className="fa fa-toggle-on fa-fw" />
                                    : <i className="fa fa-toggle-off fa-fw" />
                                }
                                <Space width={8} />
                                {i18n._('Display G-code Filename')}
                            </MenuItem>
                            <MenuItem
                                disabled={!canToggleOptions}
                                onSelect={actions.toggleLimitsVisibility}
                            >
                                {objects.limits.visible
                                    ? <i className="fa fa-toggle-on fa-fw" />
                                    : <i className="fa fa-toggle-off fa-fw" />
                                }
                                <Space width={8} />
                                {objects.limits.visible
                                    ? i18n._('Hide Limits')
                                    : i18n._('Show Limits')
                                }
                            </MenuItem>
                            <MenuItem
                                disabled={!canToggleOptions}
                                onSelect={actions.toggleCoordinateSystemVisibility}
                            >
                                {objects.coordinateSystem.visible
                                    ? <i className="fa fa-toggle-on fa-fw" />
                                    : <i className="fa fa-toggle-off fa-fw" />
                                }
                                <Space width={8} />
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
                                <Space width={8} />
                                {objects.gridLineNumbers.visible
                                    ? i18n._('Hide Grid Line Numbers')
                                    : i18n._('Show Grid Line Numbers')
                                }
                            </MenuItem>
                            <MenuItem
                                disabled={!canToggleOptions}
                                onSelect={actions.toggleCuttingToolVisibility}
                            >
                                {objects.cuttingTool.visible
                                    ? <i className="fa fa-toggle-on fa-fw" />
                                    : <i className="fa fa-toggle-off fa-fw" />
                                }
                                <Space width={8} />
                                {objects.cuttingTool.visible
                                    ? i18n._('Hide Cutting Tool')
                                    : i18n._('Show Cutting Tool')
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
