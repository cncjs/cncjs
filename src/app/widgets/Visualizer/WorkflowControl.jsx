import classNames from 'classnames';
import get from 'lodash/get';
import includes from 'lodash/includes';
import pick from 'lodash/pick';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import { Dropdown, MenuItem } from 'react-bootstrap';
import Space from 'app/components/Space';
import i18n from 'app/lib/i18n';
import log from 'app/lib/log';
import {
    // Grbl
    GRBL,
    GRBL_ACTIVE_STATE_ALARM,
    // Marlin
    MARLIN,
    // Smoothie
    SMOOTHIE,
    SMOOTHIE_ACTIVE_STATE_ALARM,
    // TinyG
    TINYG,
    TINYG_MACHINE_STATE_ALARM,
    // Workflow
    WORKFLOW_STATE_IDLE,
    WORKFLOW_STATE_PAUSED,
    WORKFLOW_STATE_RUNNING
} from '../../constants';
import {
    MODAL_WATCH_DIRECTORY
} from './constants';
import styles from './workflow-control.styl';

class WorkflowControl extends PureComponent {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    fileInputEl = null;

    handleClickUpload = (event) => {
        this.fileInputEl.value = null;
        this.fileInputEl.click();
    };

    handleChangeFile = (event) => {
        const { actions } = this.props;
        const files = event.target.files;
        const file = files[0];
        const reader = new FileReader();

        reader.onloadend = (event) => {
            const { result, error } = event.target;

            if (error) {
                log.error(error);
                return;
            }

            log.debug('FileReader:', pick(file, [
                'lastModified',
                'lastModifiedDate',
                'meta',
                'name',
                'size',
                'type'
            ]));

            const meta = {
                name: file.name,
                size: file.size
            };
            actions.uploadFile(result, meta);
        };

        try {
            reader.readAsText(file);
        } catch (err) {
            // Ignore error
        }
    };

    canRun() {
        const { state } = this.props;
        const { port, gcode, workflow } = state;
        const controllerType = state.controller.type;
        const controllerState = state.controller.state;

        if (!port) {
            return false;
        }
        if (!gcode.ready) {
            return false;
        }
        if (!includes([WORKFLOW_STATE_IDLE, WORKFLOW_STATE_PAUSED], workflow.state)) {
            return false;
        }
        if (controllerType === GRBL) {
            const activeState = get(controllerState, 'status.activeState');
            const states = [
                GRBL_ACTIVE_STATE_ALARM
            ];
            if (includes(states, activeState)) {
                return false;
            }
        }
        if (controllerType === MARLIN) {
            // Marlin does not have machine state
        }
        if (controllerType === SMOOTHIE) {
            const activeState = get(controllerState, 'status.activeState');
            const states = [
                SMOOTHIE_ACTIVE_STATE_ALARM
            ];
            if (includes(states, activeState)) {
                return false;
            }
        }
        if (controllerType === TINYG) {
            const machineState = get(controllerState, 'sr.machineState');
            const states = [
                TINYG_MACHINE_STATE_ALARM
            ];
            if (includes(states, machineState)) {
                return false;
            }
        }

        return true;
    }

    render() {
        const { state, actions } = this.props;
        const { port, gcode, workflow } = state;
        const canClick = !!port;
        const isReady = canClick && gcode.ready;
        const canRun = this.canRun();
        const canPause = isReady && includes([WORKFLOW_STATE_RUNNING], workflow.state);
        const canStop = isReady && includes([WORKFLOW_STATE_PAUSED], workflow.state);
        const canClose = isReady && includes([WORKFLOW_STATE_IDLE], workflow.state);
        const canUpload = isReady ? canClose : (canClick && !gcode.loading);

        return (
            <div className={styles.workflowControl}>
                <input
                    // The ref attribute adds a reference to the component to
                    // this.refs when the component is mounted.
                    ref={(node) => {
                        this.fileInputEl = node;
                    }}
                    type="file"
                    style={{ display: 'none' }}
                    multiple={false}
                    onChange={this.handleChangeFile}
                />
                <div className="btn-toolbar">
                    <div className="btn-group btn-group-sm">
                        <button
                            type="button"
                            className="btn btn-primary"
                            title={i18n._('Upload G-code')}
                            onClick={this.handleClickUpload}
                            disabled={!canUpload}
                        >
                            {i18n._('Upload G-code')}
                        </button>
                        <Dropdown
                            id="upload-dropdown"
                            disabled={!canUpload}
                        >
                            <Dropdown.Toggle
                                bsStyle="primary"
                                noCaret
                            >
                                <i className="fa fa-caret-down" />
                            </Dropdown.Toggle>
                            <Dropdown.Menu>
                                <MenuItem header>
                                    {i18n._('Watch Directory')}
                                </MenuItem>
                                <MenuItem
                                    onSelect={() => {
                                        actions.openModal(MODAL_WATCH_DIRECTORY);
                                    }}
                                >
                                    <i className="fa fa-search" />
                                    <Space width="4" />
                                    {i18n._('Browse...')}
                                </MenuItem>
                            </Dropdown.Menu>
                        </Dropdown>
                    </div>
                    <div className="btn-group btn-group-sm">
                        <button
                            type="button"
                            className="btn btn-default"
                            title={workflow.state === WORKFLOW_STATE_PAUSED ? i18n._('Resume') : i18n._('Run')}
                            onClick={actions.handleRun}
                            disabled={!canRun}
                        >
                            <i className="fa fa-play" />
                        </button>
                        <button
                            type="button"
                            className="btn btn-default"
                            title={i18n._('Pause')}
                            onClick={actions.handlePause}
                            disabled={!canPause}
                        >
                            <i className="fa fa-pause" />
                        </button>
                        <button
                            type="button"
                            className="btn btn-default"
                            title={i18n._('Stop')}
                            onClick={actions.handleStop}
                            disabled={!canStop}
                        >
                            <i className="fa fa-stop" />
                        </button>
                        <button
                            type="button"
                            className="btn btn-default"
                            title={i18n._('Close')}
                            onClick={actions.handleClose}
                            disabled={!canClose}
                        >
                            <i className="fa fa-close" />
                        </button>
                    </div>
                    <Dropdown
                        className="hidden"
                        bsSize="sm"
                        id="toolbar-dropdown"
                        pullRight
                    >
                        <Dropdown.Toggle
                            noCaret
                            style={{
                                paddingLeft: 8,
                                paddingRight: 8
                            }}
                        >
                            <i className="fa fa-list-alt" />
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                            <MenuItem>
                                <i className={classNames(styles.icon, styles.iconPerimeterTracingSquare)} />
                                <Space width="4" />
                            </MenuItem>
                        </Dropdown.Menu>
                    </Dropdown>
                </div>
            </div>
        );
    }
}

export default WorkflowControl;
