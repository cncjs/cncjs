import classNames from 'classnames';
import includes from 'lodash/includes';
import pick from 'lodash/pick';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import { Dropdown, MenuItem } from 'react-bootstrap';
import Space from '../../components/Space';
import controller from '../../lib/controller';
import i18n from '../../lib/i18n';
import log from '../../lib/log';
import {
    // Controller
    GRBL,
    GRBL_MACHINE_STATE_ALARM,
    MARLIN,
    SMOOTHIE,
    SMOOTHIE_MACHINE_STATE_ALARM,
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

    onClickToUpload() {
        this.fileInputEl.value = null;
        this.fileInputEl.click();
    }
    onChangeFile(event) {
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
    }
    canRun() {
        const machineState = controller.getMachineState();
        const { state } = this.props;

        if (!controller.connection.ident) {
            return false;
        }

        if (controller.type === GRBL && includes([
            GRBL_MACHINE_STATE_ALARM
        ], machineState)) {
            return false;
        }

        if (controller.type === MARLIN) {
            // Marlin does not have machine state
        }

        if (controller.type === SMOOTHIE && includes([
            SMOOTHIE_MACHINE_STATE_ALARM
        ], machineState)) {
            return false;
        }

        if (controller.type === TINYG && includes([
            TINYG_MACHINE_STATE_ALARM
        ], machineState)) {
            return false;
        }

        if (!includes([WORKFLOW_STATE_IDLE, WORKFLOW_STATE_PAUSED], controller.workflow.state)) {
            return false;
        }

        if (!state.gcode.ready) {
            return false;
        }

        return true;
    }
    render() {
        const { state, actions } = this.props;
        const { connection, gcode, workflow } = state;
        const canClick = !!connection.ident;
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
                    onChange={::this.onChangeFile}
                />
                <div className="btn-toolbar">
                    <div className="btn-group btn-group-sm">
                        <button
                            type="button"
                            className="btn btn-primary"
                            title={i18n._('Upload G-code')}
                            onClick={::this.onClickToUpload}
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
