import get from 'lodash/get';
import includes from 'lodash/includes';
import map from 'lodash/map';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Space from 'app/components/Space';
import Widget from 'app/components/Widget';
import controller from 'app/lib/controller';
import i18n from 'app/lib/i18n';
import log from 'app/lib/log';
import WidgetConfig from '../WidgetConfig';
import AutoLevel from './AutoLevel';
import ProbingSetup from './ProbingSetup';
import ApplyAutoLevel from './ApplyAutoLevel';
import {
  // Units
  IMPERIAL_UNITS,
  METRIC_UNITS,
  // Grbl
  GRBL,
  GRBL_ACTIVE_STATE_IDLE,
  // Marlin
  MARLIN,
  // Smoothie
  SMOOTHIE,
  SMOOTHIE_ACTIVE_STATE_IDLE,
  // TinyG
  TINYG,
  TINYG_MACHINE_STATE_READY,
  TINYG_MACHINE_STATE_STOP,
  TINYG_MACHINE_STATE_END,
  // Workflow
  WORKFLOW_STATE_IDLE
} from '../../constants';
import {
  MODAL_NONE,
  MODAL_PROBING_SETUP,
  MODAL_APPLY_AUTOLEVEL,
} from './constants';
import styles from './index.styl';

const gcode = (cmd, params) => {
  const s = map(params, (value, letter) => String(letter + value)).join(' ');
  return (s.length > 0) ? (cmd + ' ' + s) : cmd;
};

class AutoLevelWidget extends PureComponent {
  static propTypes = {
    widgetId: PropTypes.string.isRequired,
    onFork: PropTypes.func.isRequired,
    onRemove: PropTypes.func.isRequired,
    sortable: PropTypes.object
  };

  // Public methods
  collapse = () => {
    this.setState({ minimized: true });
  };

  expand = () => {
    this.setState({ minimized: false });
  };

  config = new WidgetConfig(this.props.widgetId);

  state = this.getInitialState();

  actions = {
    toggleFullscreen: () => {
      const { minimized, isFullscreen } = this.state;
      this.setState({
        minimized: isFullscreen ? minimized : false,
        isFullscreen: !isFullscreen
      });
    },
    toggleMinimized: () => {
      const { minimized } = this.state;
      this.setState({ minimized: !minimized });
    },
    openModal: (name = MODAL_NONE, params = {}) => {
      this.setState({
        modal: {
          name: name,
          params: params
        }
      });
    },
    closeModal: () => {
      this.setState({
        modal: {
          name: MODAL_NONE,
          params: {}
        }
      });
    },
    // Probing parameter handlers
    handleStartXChange: (event) => {
      this.setState({ startX: Number(event.target.value) });
    },
    handleEndXChange: (event) => {
      this.setState({ endX: Number(event.target.value) });
    },
    handleStartYChange: (event) => {
      this.setState({ startY: Number(event.target.value) });
    },
    handleEndYChange: (event) => {
      this.setState({ endY: Number(event.target.value) });
    },
    handleStepXChange: (event) => {
      this.setState({ stepX: Number(event.target.value) });
    },
    handleStepYChange: (event) => {
      this.setState({ stepY: Number(event.target.value) });
    },
    handleFeedXYChange: (event) => {
      this.setState({ feedXY: Number(event.target.value) });
    },
    handleFeedZChange: (event) => {
      this.setState({ feedZ: Number(event.target.value) });
    },
    handleDepthChange: (event) => {
      this.setState({ depth: Number(event.target.value) });
    },
    handleHeightChange: (event) => {
      this.setState({ height: Number(event.target.value) });
    },
    // Generate probing G-code
    generateProbingGcode: () => {
      const {
        startX, endX, stepX,
        startY, endY, stepY,
        feedXY, feedZ,
        depth, height
      } = this.state;

      const commands = [];
      commands.push(gcode('(AutoLevel: Probing Start)'));
      commands.push(gcode('G21')); // Metric units
      commands.push(gcode('G90')); // Absolute positioning
      commands.push(gcode('G0', { Z: height }));

      // Generate probe positions
      let firstPoint = true;
      for (let y = startY; y <= endY; y += stepY) {
        for (let x = startX; x <= endX; x += stepX) {
          commands.push(gcode(`(AutoLevel: Probing X${x} Y${y})`));
          commands.push(gcode('G0', { X: x, Y: y, F: feedXY }));
          commands.push(gcode('G38.2', { Z: depth, F: firstPoint ? feedZ / 2 : feedZ }));
          commands.push(gcode('G0', { Z: height }));
          firstPoint = false;
        }
      }

      commands.push(gcode('(AutoLevel: Probing End)'));
      return commands;
    },
    // Run probing sequence
    runProbing: () => {
      const {
        startX, endX, stepX,
        startY, endY, stepY,
        feedXY, feedZ,
        depth, height
      } = this.state;

      // Clear existing probing data
      this.setState({ probingData: [] });

      // Use server-side autolevel:start command
      controller.command('autolevel:start', {
        startX,
        endX,
        stepX,
        startY,
        endY,
        stepY,
        feedrate: feedXY,
        probeFeedrate: feedZ,
        startZ: height,
        endZ: depth,
      });
    },
    // Save probing G-code to file
    saveProbingGcode: () => {
      const commands = this.actions.generateProbingGcode();
      const content = commands.join('\n');
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'probing.ngc';
      a.click();
      URL.revokeObjectURL(url);
    },
    // Clear probing data
    clearProbingData: () => {
      this.setState({ probingData: [] });
    },
    // Save probing data to file
    saveProbingData: () => {
      const { probingData } = this.state;
      const content = JSON.stringify(probingData, null, 2);
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `probing_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
  };

  controllerEvents = {
    'serialport:open': (options) => {
      const { port } = options;
      this.setState({ port: port });
    },
    'serialport:close': (options) => {
      const initialState = this.getInitialState();
      this.setState({ ...initialState });
    },
    'serialport:read': (data) => {
      // Handle probing results
      if (data.type === 'probing') {
        const { result } = data;
        if (result) {
          const point = {
            x: Number(result.x),
            y: Number(result.y),
            z: Number(result.z),
          };
          this.setState(state => ({
            probingData: [...state.probingData, point]
          }));
          log.debug('Probing point received:', point);
        }
      }
    },
    'workflow:state': (workflowState) => {
      this.setState(state => ({
        workflow: {
          state: workflowState
        }
      }));
    },
    'controller:state': (type, controllerState) => {
      let units = this.state.units;

      // Grbl
      if (type === GRBL) {
        const { parserstate } = { ...controllerState };
        const { modal = {} } = { ...parserstate };
        units = {
          'G20': IMPERIAL_UNITS,
          'G21': METRIC_UNITS
        }[modal.units] || units;
      }

      // Marlin
      if (type === MARLIN) {
        const { modal = {} } = { ...controllerState };
        units = {
          'G20': IMPERIAL_UNITS,
          'G21': METRIC_UNITS
        }[modal.units] || units;
      }

      // Smoothie
      if (type === SMOOTHIE) {
        const { parserstate } = { ...controllerState };
        const { modal = {} } = { ...parserstate };
        units = {
          'G20': IMPERIAL_UNITS,
          'G21': METRIC_UNITS
        }[modal.units] || units;
      }

      // TinyG
      if (type === TINYG) {
        const { sr } = { ...controllerState };
        const { modal = {} } = { ...sr };
        units = {
          'G20': IMPERIAL_UNITS,
          'G21': METRIC_UNITS
        }[modal.units] || units;
      }

      this.setState({
        units: units,
        controller: {
          type: type,
          state: controllerState
        }
      });
    }
  };

  componentDidMount() {
    this.addControllerEvents();
  }

  componentWillUnmount() {
    this.removeControllerEvents();
  }

  componentDidUpdate(prevProps, prevState) {
    const {
      minimized,
      startX, endX, stepX,
      startY, endY, stepY,
      feedXY, feedZ,
      depth, height
    } = this.state;

    this.config.set('minimized', minimized);
    this.config.set('startX', startX);
    this.config.set('endX', endX);
    this.config.set('stepX', stepX);
    this.config.set('startY', startY);
    this.config.set('endY', endY);
    this.config.set('stepY', stepY);
    this.config.set('feedXY', feedXY);
    this.config.set('feedZ', feedZ);
    this.config.set('depth', depth);
    this.config.set('height', height);
  }

  getInitialState() {
    return {
      minimized: this.config.get('minimized', false),
      isFullscreen: false,
      canClick: true,
      port: controller.port,
      units: METRIC_UNITS,
      controller: {
        type: controller.type,
        state: controller.state
      },
      workflow: {
        state: controller.workflow.state
      },
      modal: {
        name: MODAL_NONE,
        params: {}
      },
      // Probing parameters
      startX: this.config.get('startX', 0),
      endX: this.config.get('endX', 100),
      stepX: this.config.get('stepX', 10),
      startY: this.config.get('startY', 0),
      endY: this.config.get('endY', 100),
      stepY: this.config.get('stepY', 10),
      feedXY: this.config.get('feedXY', 1000),
      feedZ: this.config.get('feedZ', 100),
      depth: this.config.get('depth', -5),
      height: this.config.get('height', 5),
      // Probing results
      probingData: [],
    };
  }

  addControllerEvents() {
    Object.keys(this.controllerEvents).forEach(eventName => {
      const callback = this.controllerEvents[eventName];
      controller.addListener(eventName, callback);
    });
  }

  removeControllerEvents() {
    Object.keys(this.controllerEvents).forEach(eventName => {
      const callback = this.controllerEvents[eventName];
      controller.removeListener(eventName, callback);
    });
  }

  canClick() {
    const { port, workflow } = this.state;
    const controllerType = this.state.controller.type;
    const controllerState = this.state.controller.state;

    if (!port) {
      return false;
    }
    if (workflow.state !== WORKFLOW_STATE_IDLE) {
      return false;
    }
    if (!includes([GRBL, MARLIN, SMOOTHIE, TINYG], controllerType)) {
      return false;
    }
    if (controllerType === GRBL) {
      const activeState = get(controllerState, 'status.activeState');
      const states = [GRBL_ACTIVE_STATE_IDLE];
      if (!includes(states, activeState)) {
        return false;
      }
    }
    if (controllerType === SMOOTHIE) {
      const activeState = get(controllerState, 'status.activeState');
      const states = [SMOOTHIE_ACTIVE_STATE_IDLE];
      if (!includes(states, activeState)) {
        return false;
      }
    }
    if (controllerType === TINYG) {
      const machineState = get(controllerState, 'sr.machineState');
      const states = [
        TINYG_MACHINE_STATE_READY,
        TINYG_MACHINE_STATE_STOP,
        TINYG_MACHINE_STATE_END
      ];
      if (!includes(states, machineState)) {
        return false;
      }
    }

    return true;
  }

  render() {
    const { widgetId } = this.props;
    const { minimized, isFullscreen } = this.state;
    const isForkedWidget = widgetId.match(/\w+:[\w\-]+/);
    const state = {
      ...this.state,
      canClick: this.canClick()
    };
    const actions = this.actions;

    return (
      <Widget fullscreen={isFullscreen}>
        <Widget.Header>
          <Widget.Title>
            <Widget.Sortable className={this.props.sortable.handleClassName}>
              <i className="fa fa-bars" />
              <Space width="8" />
            </Widget.Sortable>
            {isForkedWidget &&
              <i className="fa fa-code-fork" style={{ marginRight: 5 }} />
            }
            {i18n._('AutoLevel')}
          </Widget.Title>
          <Widget.Controls className={this.props.sortable.filterClassName}>
            <Widget.Button
              disabled={isFullscreen}
              title={minimized ? i18n._('Expand') : i18n._('Collapse')}
              onClick={actions.toggleMinimized}
            >
              <i
                className={classNames(
                  'fa',
                  { 'fa-chevron-up': !minimized },
                  { 'fa-chevron-down': minimized }
                )}
              />
            </Widget.Button>
            <Widget.DropdownButton
              title={i18n._('More')}
              toggle={<i className="fa fa-ellipsis-v" />}
              onSelect={(eventKey) => {
                if (eventKey === 'fullscreen') {
                  actions.toggleFullscreen();
                } else if (eventKey === 'fork') {
                  this.props.onFork();
                } else if (eventKey === 'remove') {
                  this.props.onRemove();
                }
              }}
            >
              <Widget.DropdownMenuItem eventKey="fullscreen">
                <i
                  className={classNames(
                    'fa',
                    'fa-fw',
                    { 'fa-expand': !isFullscreen },
                    { 'fa-compress': isFullscreen }
                  )}
                />
                <Space width="4" />
                {!isFullscreen ? i18n._('Enter Full Screen') : i18n._('Exit Full Screen')}
              </Widget.DropdownMenuItem>
              <Widget.DropdownMenuItem eventKey="fork">
                <i className="fa fa-fw fa-code-fork" />
                <Space width="4" />
                {i18n._('Fork Widget')}
              </Widget.DropdownMenuItem>
              <Widget.DropdownMenuItem eventKey="remove">
                <i className="fa fa-fw fa-times" />
                <Space width="4" />
                {i18n._('Remove Widget')}
              </Widget.DropdownMenuItem>
            </Widget.DropdownButton>
          </Widget.Controls>
        </Widget.Header>
        <Widget.Content
          className={classNames(
            styles.widgetContent,
            { [styles.hidden]: minimized }
          )}
        >
          {state.modal.name === MODAL_PROBING_SETUP && (
            <ProbingSetup state={state} actions={actions} />
          )}
          {state.modal.name === MODAL_APPLY_AUTOLEVEL && (
            <ApplyAutoLevel state={state} actions={actions} />
          )}
          <AutoLevel state={state} actions={actions} />
        </Widget.Content>
      </Widget>
    );
  }
}

export default AutoLevelWidget;
