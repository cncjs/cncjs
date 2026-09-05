import get from 'lodash/get';
import includes from 'lodash/includes';
import pick from 'lodash/pick';
import cx from 'classnames';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import api from 'app/api';
import { Button, ButtonGroup, ButtonToolbar } from 'app/components/Buttons';
import Dropdown, { MenuItem } from 'app/components/Dropdown';
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

    state = {
      savePermanently: false,
      watchDirectoryConfigured: false
    };

    fileInputEl = null;

    componentDidMount() {
      api.watch.getStatus()
        .then((res) => {
          const { configured = false } = { ...res.body };
          this.setState({ watchDirectoryConfigured: configured });
        })
        .catch((res) => {
          // Ignore error
        });
    }

    handleClickUpload = (event) => {
      this.fileInputEl.value = null;
      this.fileInputEl.click();
    };

    handleChangeSavePermanently = (event) => {
      this.setState({ savePermanently: event.target.checked });
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
          size: file.size,
          savePermanently: this.state.savePermanently && this.state.watchDirectoryConfigured
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
          <ButtonToolbar>
            <ButtonGroup
              style={{
                backgroundColor: 'white',
              }}
            >
              <Button
                btnStyle="primary"
                btnSize="sm"
                title={i18n._('Upload G-code')}
                onClick={this.handleClickUpload}
                disabled={!canUpload}
                style={{ minWidth: 0 }}
              >
                {i18n._('Upload G-code')}
              </Button>
              <Dropdown
                btnStyle="primary"
                btnSize="sm"
                disabled={!canUpload}
              >
                <Dropdown.Toggle
                  btnStyle="primary"
                  noCaret
                  style={{ minWidth: 0, padding: '4px 8px' }}
                >
                  <i aria-hidden="true" className="fa fa-fw fa-caret-down" style={{ marginRight: 0 }} />
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
                    <i aria-hidden="true" className="fa fa-search" />
                    <Space width="4" />
                    {i18n._('Browse...')}
                  </MenuItem>
                </Dropdown.Menu>
              </Dropdown>
            </ButtonGroup>
            <ButtonGroup
              btnStyle="flat"
              btnSize="sm"
              style={{
                backgroundColor: 'white',
              }}
            >
              <Button
                aria-label="Run"
                title={workflow.state === WORKFLOW_STATE_PAUSED ? i18n._('Resume') : i18n._('Run')}
                onClick={actions.handleRun}
                disabled={!canRun}
                style={{ minWidth: 0, padding: '4px 8px' }}
              >
                <i aria-hidden="true" className="fa fa-fw fa-play" style={{ marginRight: 0 }} />
              </Button>
              <Button
                aria-label="Pause"
                title={i18n._('Pause')}
                onClick={actions.handlePause}
                disabled={!canPause}
                style={{ minWidth: 0, padding: '4px 8px' }}
              >
                <i aria-hidden="true" className="fa fa-fw fa-pause" style={{ marginRight: 0 }} />
              </Button>
              <Button
                aria-label="Stop"
                title={i18n._('Stop')}
                onClick={actions.handleStop}
                disabled={!canStop}
                style={{ minWidth: 0, padding: '4px 8px' }}
              >
                <i aria-hidden="true" className="fa fa-fw fa-stop" style={{ marginRight: 0 }} />
              </Button>
              <Button
                aria-label="Close G-code file"
                title={i18n._('Close')}
                onClick={actions.handleClose}
                disabled={!canClose}
                style={{ minWidth: 0, padding: '4px 8px' }}
              >
                <i aria-hidden="true" className="fa fa-fw fa-close" style={{ marginRight: 0 }} />
              </Button>
            </ButtonGroup>
          </ButtonToolbar>
          <div
            className={cx('checkbox', {
              'disabled': !this.state.watchDirectoryConfigured
            })}
            style={{ marginTop: 5, marginBottom: 0 }}
          >
            <label title={this.state.watchDirectoryConfigured ? undefined : i18n._('No watch directory is configured on the server')}>
              <input
                type="checkbox"
                checked={this.state.savePermanently}
                onChange={this.handleChangeSavePermanently}
                disabled={!this.state.watchDirectoryConfigured}
              />
              {i18n._('Save to Watch Directory')}
            </label>
          </div>
        </div>
      );
    }
}

export default WorkflowControl;
