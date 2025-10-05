import debounce from 'lodash/debounce';
import get from 'lodash/get';
import includes from 'lodash/includes';
import mapValues from 'lodash/mapValues';
import classNames from 'classnames';
import { ensureNumber, ensureString } from 'ensure-type';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import api from 'app/api';
import Space from 'app/components/Space';
import Widget from 'app/components/Widget';
import controller from 'app/lib/controller';
import i18n from 'app/lib/i18n';
import ImmutableStore from 'app/lib/immutable-store';
import log from 'app/lib/log';
import { in2mm, mapPositionToUnits, mapValueToUnits } from 'app/lib/units';
import WidgetConfig from '../WidgetConfig';
import Tool from './Tool';
import {
  // Units
  IMPERIAL_UNITS,
  METRIC_UNITS,
  // Grbl
  GRBL,
  // Marlin
  MARLIN,
  // Smoothie
  SMOOTHIE,
  // TinyG
  TINYG,
} from '../../constants';
import {
  MODAL_NONE,
  TOOL_CHANGE_POLICY_IGNORE_M6_COMMANDS,
} from './constants';
import styles from './index.styl';

class ToolWidget extends PureComponent {
  static propTypes = {
    widgetId: PropTypes.string.isRequired,
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

  toolConfig = new ImmutableStore();

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
    updateModalParams: (params = {}) => {
      this.setState({
        modal: {
          ...this.state.modal,
          params: {
            ...this.state.modal.params,
            ...params
          }
        }
      });
    },
    setToolChangePolicy: (value) => {
      this.setState({
        toolConfig: {
          ...this.state.toolConfig,
          toolChangePolicy: value,
        },
      });
    },
    setToolChangePosition: (pos) => {
      const { x, y, z } = pos;
      this.setState({
        toolConfig: {
          ...this.state.toolConfig,
          toolChangeX: x ?? this.state.toolConfig.toolChangeX,
          toolChangeY: y ?? this.state.toolConfig.toolChangeY,
          toolChangeZ: z ?? this.state.toolConfig.toolChangeZ,
        },
      });
    },
    setToolProbePosition: (pos) => {
      const { x, y, z } = pos;
      this.setState({
        toolConfig: {
          ...this.state.toolConfig,
          toolProbeX: x ?? this.state.toolConfig.toolProbeX,
          toolProbeY: y ?? this.state.toolConfig.toolProbeY,
          toolProbeZ: z ?? this.state.toolConfig.toolProbeZ,
        },
      });
    },
    setToolProbeCustomCommands: (value) => {
      this.setState({
        toolConfig: {
          ...this.state.toolConfig,
          toolProbeCustomCommands: value,
        },
      });
    },
    setToolProbeCommand: (value) => {
      this.setState({
        toolConfig: {
          ...this.state.toolConfig,
          toolProbeCommand: value,
        },
      });
    },
    setToolProbeDistance: (value) => {
      this.setState({
        toolConfig: {
          ...this.state.toolConfig,
          toolProbeDistance: value,
        },
      });
    },
    setToolProbeFeedrate: (value) => {
      this.setState({
        toolConfig: {
          ...this.state.toolConfig,
          toolProbeFeedrate: value,
        },
      });
    },
    setTouchPlateHeight: (value) => {
      this.setState({
        toolConfig: {
          ...this.state.toolConfig,
          touchPlateHeight: value,
        },
      });
    },
  };

  controllerEvents = {
    'serialport:open': (options) => {
      const { port, controllerType } = options;
      this.setState({
        isReady: !!controllerType,
        port: port,
      });
    },
    'serialport:close': (options) => {
      const initialState = this.getInitialState();
      this.setState({
        ...initialState,
        toolConfig: this.state.toolConfig, // Retain the current tool configuration
      });
    },
    'workflow:state': (workflowState) => {
      this.setState(state => ({
        workflow: {
          state: workflowState
        }
      }));
    },
    'controller:state': (controllerType, controllerState) => {
      let units = this.state.units;
      let machinePosition = this.state.machinePosition;
      let workPosition = this.state.workPosition;

      // Grbl
      if (controllerType === GRBL) {
        const { status, parserstate } = { ...controllerState };
        const { mpos, wpos } = status;
        const { modal = {} } = { ...parserstate };
        const $13 = Number(get(controller.settings, 'settings.$13', 0)) || 0;
        units = {
          'G20': IMPERIAL_UNITS,
          'G21': METRIC_UNITS
        }[modal.units] || units;
        // Machine position are reported in mm ($13=0) or inches ($13=1)
        machinePosition = mapValues({
          ...machinePosition,
          ...mpos
        }, (val) => {
          return ($13 > 0) ? in2mm(val) : val;
        });
        // Work position are reported in mm ($13=0) or inches ($13=1)
        workPosition = mapValues({
          ...workPosition,
          ...wpos
        }, val => {
          return ($13 > 0) ? in2mm(val) : val;
        });
      }

      // Marlin
      if (controllerType === MARLIN) {
        const { pos, modal = {} } = { ...controllerState };
        units = {
          'G20': IMPERIAL_UNITS,
          'G21': METRIC_UNITS
        }[modal.units] || units;
        // Machine position is always reported in mm
        machinePosition = {
          ...machinePosition,
          ...pos,
        };
        // Work position is always reported in mm
        workPosition = {
          ...workPosition,
          ...pos,
        };
      }

      // Smoothie
      if (controllerType === SMOOTHIE) {
        const { status, parserstate } = { ...controllerState };
        const { mpos, wpos } = status;
        const { modal = {} } = { ...parserstate };
        units = {
          'G20': IMPERIAL_UNITS,
          'G21': METRIC_UNITS
        }[modal.units] || units;
        // Machine position are reported in current units
        machinePosition = mapValues({
          ...machinePosition,
          ...mpos
        }, (val) => {
          return (units === IMPERIAL_UNITS) ? in2mm(val) : val;
        });
        // Work position are reported in current units
        workPosition = mapValues({
          ...workPosition,
          ...wpos
        }, (val) => {
          return (units === IMPERIAL_UNITS) ? in2mm(val) : val;
        });
      }

      // TinyG
      if (controllerType === TINYG) {
        const { sr } = { ...controllerState };
        const { mpos, wpos, modal = {} } = { ...sr };
        units = {
          'G20': IMPERIAL_UNITS,
          'G21': METRIC_UNITS
        }[modal.units] || units;
        // https://github.com/synthetos/g2/wiki/Status-Reports
        // Canonical machine position are always reported in millimeters with no offsets.
        machinePosition = {
          ...machinePosition,
          ...mpos
        };
        // Work position are reported in current units, and also apply any offsets.
        workPosition = mapValues({
          ...workPosition,
          ...wpos
        }, (val) => {
          return (units === IMPERIAL_UNITS) ? in2mm(val) : val;
        });
      }

      if (this.state.units !== units) {
        // Set `this.unitsDidChange` to true if the unit has changed
        this.unitsDidChange = true;
      }

      this.setState({
        units,
        controller: {
          type: controllerType,
          state: controllerState,
        },
        machinePosition,
        workPosition,
        isFetchingToolConfig: false,
        toolConfig: {
          toolChangePolicy: this.toolConfig.get('toolChangePolicy'),
          toolChangeX: mapPositionToUnits(this.toolConfig.get('toolChangeX'), units),
          toolChangeY: mapPositionToUnits(this.toolConfig.get('toolChangeY'), units),
          toolChangeZ: mapPositionToUnits(this.toolConfig.get('toolChangeZ'), units),
          toolProbeCommand: this.toolConfig.get('toolProbeCommand'),
          toolProbeDistance: mapValueToUnits(this.toolConfig.get('toolProbeDistance'), units),
          toolProbeFeedrate: mapValueToUnits(this.toolConfig.get('toolProbeFeedrate'), units),
          toolProbeX: mapPositionToUnits(this.toolConfig.get('toolProbeX'), units),
          toolProbeY: mapPositionToUnits(this.toolConfig.get('toolProbeY'), units),
          toolProbeZ: mapPositionToUnits(this.toolConfig.get('toolProbeZ'), units),
          touchPlateHeight: mapValueToUnits(this.toolConfig.get('touchPlateHeight'), units),
        },
      });
    }
  };

  loadToolConfig = async () => {
    this.setState({ isFetchingToolConfig: true });

    try {
      const res = await api.getToolConfig();
      const tool = res.body;
      const units = this.state.units;

      // Tool configuration values are stored in the metric system
      this.toolConfig.set('toolChangePolicy', ensureNumber(get(tool, 'toolChangePolicy', TOOL_CHANGE_POLICY_IGNORE_M6_COMMANDS)));
      this.toolConfig.set('toolChangeX', ensureNumber(get(tool, 'toolChangeX', 0)));
      this.toolConfig.set('toolChangeY', ensureNumber(get(tool, 'toolChangeY', 0)));
      this.toolConfig.set('toolChangeZ', ensureNumber(get(tool, 'toolChangeZ', 0)));
      this.toolConfig.set('toolProbeX', ensureNumber(get(tool, 'toolProbeX', 0)));
      this.toolConfig.set('toolProbeY', ensureNumber(get(tool, 'toolProbeY', 0)));
      this.toolConfig.set('toolProbeZ', ensureNumber(get(tool, 'toolProbeZ', 0)));
      this.toolConfig.set('toolProbeCustomCommands', ensureString(get(tool, 'toolProbeCustomCommands')));
      this.toolConfig.set('toolProbeCommand', ensureString(get(tool, 'toolProbeCommand', 'G38.2')));
      this.toolConfig.set('toolProbeDistance', ensureNumber(get(tool, 'toolProbeDistance', 1)));
      this.toolConfig.set('toolProbeFeedrate', ensureNumber(get(tool, 'toolProbeFeedrate', 10)));
      this.toolConfig.set('touchPlateHeight', ensureNumber(get(tool, 'touchPlateHeight', 0)));

      // The state reflects the values in the current display units
      this.setState({
        toolConfig: {
          toolChangePolicy: this.toolConfig.get('toolChangePolicy'),
          toolChangeX: mapPositionToUnits(this.toolConfig.get('toolChangeX'), units),
          toolChangeY: mapPositionToUnits(this.toolConfig.get('toolChangeY'), units),
          toolChangeZ: mapPositionToUnits(this.toolConfig.get('toolChangeZ'), units),
          toolProbeX: mapPositionToUnits(this.toolConfig.get('toolProbeX'), units),
          toolProbeY: mapPositionToUnits(this.toolConfig.get('toolProbeY'), units),
          toolProbeZ: mapPositionToUnits(this.toolConfig.get('toolProbeZ'), units),
          toolProbeCustomCommands: this.toolConfig.get('toolProbeCustomCommands'),
          toolProbeCommand: this.toolConfig.get('toolProbeCommand'),
          toolProbeDistance: mapValueToUnits(this.toolConfig.get('toolProbeDistance'), units),
          toolProbeFeedrate: mapValueToUnits(this.toolConfig.get('toolProbeFeedrate'), units),
          touchPlateHeight: mapValueToUnits(this.toolConfig.get('touchPlateHeight'), units),
        },
      });

      this.toolConfig.removeAllListeners();

      this.toolConfig.on('change', debounce(async (data) => {
        try {
          await api.setToolConfig(data);
        } catch (err) {
          log.error(err);
        }
      }, 100));
    } catch (err) {
      log.error(err);
    }

    this.setState({ isFetchingToolConfig: false });
  };

  unitsDidChange = false;

  componentDidMount() {
    this.addControllerEvents();
    this.loadToolConfig();
  }

  componentWillUnmount() {
    this.removeControllerEvents();
  }

  componentDidUpdate(prevProps, prevState) {
    const {
      minimized
    } = this.state;

    this.config.set('minimized', minimized);

    // Do not save config settings if the units did change between in and mm
    if (this.unitsDidChange) {
      this.unitsDidChange = false;
      return;
    }

    const toolConfig = this.state.toolConfig;
    if (!toolConfig) {
      return;
    }

    const units = this.state.units;
    const toMetric = (value) => ensureNumber((units === IMPERIAL_UNITS) ? in2mm(value) : value);
    const {
      toolChangePolicy,
      toolChangeX,
      toolChangeY,
      toolChangeZ,
      toolProbeCommand,
      toolProbeCustomCommands,
      toolProbeDistance,
      toolProbeFeedrate,
      toolProbeX,
      toolProbeY,
      toolProbeZ,
      touchPlateHeight,
    } = this.state.toolConfig;

    // Tool Config
    this.toolConfig.set('toolChangePolicy', ensureNumber(toolChangePolicy));
    this.toolConfig.set('toolChangeX', toMetric(toolChangeX));
    this.toolConfig.set('toolChangeY', toMetric(toolChangeY));
    this.toolConfig.set('toolChangeZ', toMetric(toolChangeZ));
    this.toolConfig.set('toolProbeX', toMetric(toolProbeX));
    this.toolConfig.set('toolProbeY', toMetric(toolProbeY));
    this.toolConfig.set('toolProbeZ', toMetric(toolProbeZ));
    this.toolConfig.set('toolProbeCustomCommands', ensureString(toolProbeCustomCommands));
    this.toolConfig.set('toolProbeCommand', ensureString(toolProbeCommand));
    this.toolConfig.set('toolProbeDistance', toMetric(toolProbeDistance));
    this.toolConfig.set('toolProbeFeedrate', toMetric(toolProbeFeedrate));
    this.toolConfig.set('touchPlateHeight', toMetric(touchPlateHeight));
  }

  getInitialState() {
    return {
      minimized: this.config.get('minimized', false),
      isReady: !!controller.type,
      isFullscreen: false,
      canClick: true, // Defaults to true
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
      toolConfig: null,
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

  getWorkCoordinateSystem() {
    const controllerType = this.state.controller.type;
    const controllerState = this.state.controller.state;
    const defaultWCS = 'G54';

    if (controllerType === GRBL) {
      return get(controllerState, 'parserstate.modal.wcs') || defaultWCS;
    }

    if (controllerType === MARLIN) {
      return get(controllerState, 'modal.wcs') || defaultWCS;
    }

    if (controllerType === SMOOTHIE) {
      return get(controllerState, 'parserstate.modal.wcs') || defaultWCS;
    }

    if (controllerType === TINYG) {
      return get(controllerState, 'sr.modal.wcs') || defaultWCS;
    }

    return defaultWCS;
  }

  canClick() {
    const { port } = this.state;
    const controllerType = this.state.controller.type;

    if (!port) {
      return false;
    }
    if (!includes([GRBL, MARLIN, SMOOTHIE, TINYG], controllerType)) {
      return false;
    }
    return true;
  }

  render() {
    const { minimized, isFullscreen } = this.state;
    const state = {
      ...this.state,
      canClick: this.canClick()
    };
    const actions = {
      ...this.actions
    };

    return (
      <Widget fullscreen={isFullscreen}>
        <Widget.Header>
          <Widget.Title>
            <Widget.Sortable className={this.props.sortable.handleClassName}>
              <i className="fa fa-bars" />
              <Space width="8" />
            </Widget.Sortable>
            {i18n._('Tool')}
          </Widget.Title>
          <Widget.Controls className={this.props.sortable.filterClassName}>
            <Widget.Button
              title={i18n._('Refresh')}
              onClick={this.loadToolConfig}
            >
              <i
                className={classNames(
                  'fa',
                  'fa-refresh',
                  { 'fa-spin': state.isFetchingToolConfig },
                )}
              />
            </Widget.Button>
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
            styles['widget-content'],
            { [styles.hidden]: minimized }
          )}
        >
          <Tool
            state={state}
            actions={actions}
          />
        </Widget.Content>
      </Widget>
    );
  }
}

export default ToolWidget;
