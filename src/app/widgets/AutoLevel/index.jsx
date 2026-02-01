import get from 'lodash/get';
import includes from 'lodash/includes';
import classNames from 'classnames';
import pubsub from 'pubsub-js';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Space from 'app/components/Space';
import Widget from 'app/components/Widget';
import api from 'app/api';
import controller from 'app/lib/controller';
import i18n from 'app/lib/i18n';
import log from 'app/lib/log';
import WidgetConfig from '../WidgetConfig';
import LandingView from './LandingView';
import SetupProbeView from './SetupProbeView';
import LoadProbeView from './LoadProbeView';
import ApplyView from './ApplyView';
import StartProbeModal from './StartProbeModal';
import StopProbeModal from './StopProbeModal';
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
  VIEW_LANDING,
  VIEW_SETUP_PROBE,
  VIEW_PROBING,
  VIEW_LOAD_PROBE,
  VIEW_APPLY,
  PROBE_STATE_IDLE,
  PROBE_STATE_RUNNING,
  PROBE_STATE_STOPPED,
  PROBE_STATE_COMPLETED,
  MODAL_NONE,
  MODAL_START_PROBE_CONFIRM,
  MODAL_STOP_PROBE_CONFIRM,
} from './constants';
import styles from './index.styl';

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
    // Widget controls
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
    toggleProbePreview: () => {
      const { showProbePreview } = this.state;
      const newValue = !showProbePreview;
      this.setState({ showProbePreview: newValue });

      if (newValue) {
        // Show visualization
        const { probedPositions, startX, startY, endX, endY } = this.state;
        pubsub.publish('autolevel:showProbeVisualization', {
          probeData: probedPositions,
          config: { startX, startY, endX, endY },
        });
      } else {
        // Hide visualization
        pubsub.publish('autolevel:hideProbeVisualization');
      }
    },

    // Modal management
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

    // Navigation actions
    startNewProbe: () => {
      const { startX, startY, endX, endY, units } = this.state;
      this.setState({ wizardView: VIEW_SETUP_PROBE });

      // Force hide any existing probe visualization first
      pubsub.publish('autolevel:hideProbeVisualization');

      // Small delay to ensure cleanup completes
      setTimeout(() => {
        // Show probe area boundary in 3D visualizer with current form values
        log.info('[AutoLevel] Publishing probe visualization', { startX, startY, endX, endY });
        pubsub.publish('autolevel:showProbeVisualization', {
          probeData: [],
          config: { startX, startY, endX, endY, units },
        });
      }, 50);
    },
    loadProbeFile: () => {
      // Open file dialog
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.probe';
      input.onchange = (event) => {
        const file = event.target.files[0];
        if (!file) {
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          const filepath = file.name;
          const data = e.target.result;
          this.actions.handleProbeFileLoaded(filepath, data);
        };
        reader.readAsText(file);
      };
      input.click();
    },
    handleProbeFileLoaded: (filepath, data) => {
      try {
        const lines = data.split('\n').filter(line => line.trim().length > 0);
        const probedPositions = [];
        let minZ = Infinity;
        let maxZ = -Infinity;
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;

        lines.forEach(line => {
          const values = line.trim().split(/\s+/).map(Number);
          const [x, y, z] = values;
          if (!Number.isNaN(x) && !Number.isNaN(y) && !Number.isNaN(z)) {
            probedPositions.push({ x, y, z });
            minZ = Math.min(z, minZ);
            maxZ = Math.max(z, maxZ);
            minX = Math.min(x, minX);
            maxX = Math.max(x, maxX);
            minY = Math.min(y, minY);
            maxY = Math.max(y, maxY);
          }
        });

        this.setState({
          wizardView: VIEW_APPLY,
          probeFileName: filepath,
          probedPositions,
          probeStats: {
            points: probedPositions.length,
            minZ,
            maxZ,
            maxDeviation: maxZ - minZ,
          },
        });

        // Show probe visualization in 3D viewer
        pubsub.publish('autolevel:showProbeVisualization', {
          probeData: probedPositions,
          config: {
            startX: minX,
            startY: minY,
            endX: maxX,
            endY: maxY,
            units: this.state.units,
          },
        });

        log.info(`Loaded ${probedPositions.length} points from ${filepath}`);
      } catch (err) {
        log.error('Error loading probe file:', err);
      }
    },
    backToLanding: () => {
      this.setState({
        wizardView: VIEW_LANDING,
        probeState: PROBE_STATE_IDLE,
      });

      // Hide probe visualization
      pubsub.publish('autolevel:hideProbeVisualization');
    },
    goToApply: () => {
      this.setState({ wizardView: VIEW_APPLY });

      // Update visualization when going to apply view
      const { probedPositions, startX, startY, endX, endY, units } = this.state;
      if (probedPositions.length > 0) {
        pubsub.publish('autolevel:showProbeVisualization', {
          probeData: probedPositions,
          config: { startX, startY, endX, endY, units },
        });
      }
    },

    // Probe configuration handlers
    handleStepSizeChange: (event) => {
      this.setState({ stepSize: Number(event.target.value) });
    },
    handleStartXChange: (event) => {
      this.setState({ startX: Number(event.target.value) });
    },
    handleStartYChange: (event) => {
      this.setState({ startY: Number(event.target.value) });
    },
    handleEndXChange: (event) => {
      this.setState({ endX: Number(event.target.value) });
    },
    handleEndYChange: (event) => {
      this.setState({ endY: Number(event.target.value) });
    },
    // Select all text on focus for easy value replacement
    handleInputFocus: (event) => {
      // Store current value as previous valid value
      const inputName = event.target.name;
      if (inputName) {
        this.previousValidValues = this.previousValidValues || {};
        this.previousValidValues[inputName] = this.state[inputName];
      }
      event.target.select();
    },
    // Validate and publish visualizer updates on blur
    handleProbeAreaBlur: (event) => {
      const { startX, startY, endX, endY, units } = this.state;
      const inputName = event.target.name;

      // Validate: check for NaN or invalid values
      let isValid = true;
      if (Number.isNaN(startX) || Number.isNaN(startY) || Number.isNaN(endX) || Number.isNaN(endY)) {
        isValid = false;
      }
      // Check that endX > startX and endY > startY (prevent negative area)
      if (endX <= startX || endY <= startY) {
        isValid = false;
      }

      // If invalid, restore previous valid value
      if (!isValid && inputName && this.previousValidValues && this.previousValidValues[inputName] !== undefined) {
        this.setState({ [inputName]: this.previousValidValues[inputName] });
        log.warn('[AutoLevel] Invalid value entered, restoring previous:', this.previousValidValues[inputName]);
        return;
      }

      // If valid, update visualizer
      if (this.state.wizardView === VIEW_SETUP_PROBE || this.state.wizardView === VIEW_PROBING) {
        pubsub.publish('autolevel:updateProbeVisualization', {
          config: { startX, startY, endX, endY, units }
        });
      }
    },
    handleClearanceHeightChange: (event) => {
      this.setState({ clearanceHeight: Number(event.target.value) });
    },
    handleProbeStartZChange: (event) => {
      this.setState({ probeStartZ: Number(event.target.value) });
    },
    handleProbeEndZChange: (event) => {
      this.setState({ probeEndZ: Number(event.target.value) });
    },
    handleProbeFeedrateChange: (event) => {
      this.setState({ probeFeedrate: Number(event.target.value) });
    },
    handleFeedXYChange: (event) => {
      this.setState({ feedXY: Number(event.target.value) });
    },

    // Probe operations
    runTestProbe: () => {
      const { probeEndZ, probeFeedrate } = this.state;
      controller.command('autolevel:runTestProbe', {
        depth: probeEndZ,
        feedrate: probeFeedrate,
      });
      log.info('Running test probe');
    },
    showStartProbeConfirmation: () => {
      this.actions.openModal(MODAL_START_PROBE_CONFIRM);
    },
    showStopProbeConfirmation: () => {
      this.actions.openModal(MODAL_STOP_PROBE_CONFIRM);
    },
    startProbing: () => {
      const {
        startX, endX, stepSize,
        startY, endY,
        probeStartZ, probeEndZ,
        feedXY, probeFeedrate,
      } = this.state;

      // Calculate total points
      const numPointsX = Math.floor((endX - startX) / stepSize) + 1;
      const numPointsY = Math.floor((endY - startY) / stepSize) + 1;
      const totalPoints = numPointsX * numPointsY;

      this.actions.closeModal();
      this.setState({
        probeState: PROBE_STATE_RUNNING,
        probedPositions: [],
        probeProgress: {
          current: 0,
          total: totalPoints,
          percentage: 0,
        },
      });

      controller.command('autolevel:startProbing', {
        startX,
        endX,
        stepX: stepSize,
        startY,
        endY,
        stepY: stepSize,
        startZ: probeStartZ,
        endZ: probeEndZ,
        feedrate: feedXY,
        probeFeedrate,
      });

      log.info('Starting probe sequence');
    },
    stopProbing: () => {
      this.actions.closeModal();
      this.setState({
        probeState: PROBE_STATE_STOPPED,
      });

      // Send feed hold to stop ongoing operations
      controller.command('feedhold');

      // Hide visualization
      pubsub.publish('autolevel:hideProbeVisualization');

      log.info('Probing stopped by user');
    },

    // Probe data management
    saveProbeData: () => {
      const { probedPositions, probeFileName } = this.state;
      const data = probedPositions.map(({ x, y, z }) => {
        const a = 0, b = 0, c = 0;
        const u = 0, v = 0, w = 0;
        return `${x} ${y} ${z} ${a} ${b} ${c} ${u} ${v} ${w}`;
      }).join('\n');

      const blob = new Blob([data], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = probeFileName || `probe_${Date.now()}.probe`;
      a.click();
      URL.revokeObjectURL(url);

      log.info('Probe data saved');
    },

    // G-code operations
    applyToGcode: (gcode, gcodeFileName, port) => {
      const { probedPositions } = this.state;

      controller.command('autolevel:applyProbeCompensation', {
        gcode,
        probeData: probedPositions,
      }, (err, result) => {
        if (err) {
          log.error('Error applying auto-level:', err);
          return;
        }

        const { compensatedGcode } = result;

        // Load compensated G-code to server
        const name = `AL_${gcodeFileName}`;
        api.loadGCode({ port, name, gcode: compensatedGcode })
          .then((res) => {
            const { name: loadedName = '', gcode: loadedGcode = '' } = { ...res.body };
            pubsub.publish('gcode:load', { name: loadedName, gcode: loadedGcode });
            this.setState({ gcodeApplied: true });
            log.info('Auto-level applied and G-code loaded to server');
          })
          .catch(() => {
            log.error('Failed to load compensated G-code to server');
          });
      });
    },
    exportLevelledGcode: (gcode, gcodeFileName) => {
      const { probedPositions } = this.state;

      controller.command('autolevel:applyProbeCompensation', {
        gcode,
        probeData: probedPositions,
      }, (err, result) => {
        if (err) {
          log.error('Error applying auto-level:', err);
          return;
        }

        const { compensatedGcode } = result;

        const blob = new Blob([compensatedGcode], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AL_${gcodeFileName}`;
        a.click();
        URL.revokeObjectURL(url);

        log.info('Levelled G-code exported');
      });
    },
    closeWidget: () => {
      this.setState({
        wizardView: VIEW_LANDING,
        probeState: PROBE_STATE_IDLE,
        probedPositions: [],
        probeStats: null,
        gcodeApplied: false,
      });

      // Hide probe visualization
      pubsub.publish('autolevel:hideProbeVisualization');
    },
    resetGcodeApplied: () => {
      this.setState({ gcodeApplied: false });
      log.info('[AutoLevel] Reset apply state for new G-code file');
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
    'workflow:state': (workflowState) => {
      this.setState(state => ({
        workflow: {
          state: workflowState
        }
      }));
    },
    'controller:state': (type, controllerState) => {
      let units = this.state.units;

      // Update units based on controller type
      if (type === GRBL) {
        const { parserstate } = { ...controllerState };
        const { modal = {} } = { ...parserstate };
        units = {
          'G20': IMPERIAL_UNITS,
          'G21': METRIC_UNITS
        }[modal.units] || units;
      }

      if (type === MARLIN) {
        const { modal = {} } = { ...controllerState };
        units = {
          'G20': IMPERIAL_UNITS,
          'G21': METRIC_UNITS
        }[modal.units] || units;
      }

      if (type === SMOOTHIE) {
        const { parserstate } = { ...controllerState };
        const { modal = {} } = { ...parserstate };
        units = {
          'G20': IMPERIAL_UNITS,
          'G21': METRIC_UNITS
        }[modal.units] || units;
      }

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
    },
    'autolevel:update': (data) => {
      log.info('[AutoLevel] Received autolevel:update event', data);
      const { current, total, probedPos, minZ, maxZ, maxDeviation } = data;

      this.setState(state => {
        const updatedPositions = [...state.probedPositions, probedPos];

        // Update 3D visualizer with current probe data
        const { startX, startY, endX, endY, showProbePreview, units } = state;
        if (showProbePreview) {
          log.debug('[AutoLevel] Updating visualization with point', current, '/', total);
          pubsub.publish('autolevel:showProbeVisualization', {
            probeData: updatedPositions,
            config: { startX, startY, endX, endY, units },
          });
        }

        return {
          probedPositions: updatedPositions,
          probeProgress: {
            current,
            total,
            percentage: Math.round((current / total) * 100),
          },
          probeStats: {
            points: current,
            minZ,
            maxZ,
            maxDeviation,
          },
        };
      });

      log.debug(`Probed ${current}/${total} points`);
    },
    'autolevel:complete': () => {
      this.setState({
        probeState: PROBE_STATE_COMPLETED,
        wizardView: VIEW_APPLY,
      });

      // Keep probe visualization visible for Apply view
      log.info('Probing completed');
    },
  };

  componentDidMount() {
    this.addControllerEvents();

    // Subscribe to probe area updates from visualizer
    this.pubsubTokens = [];
    this.pubsubTokens.push(
      pubsub.subscribe('autolevel:probeAreaUpdated', (msg, data) => {
        const { startX, startY, endX, endY } = data;

        // Update state with rounded values
        this.setState({
          startX: Math.round(startX * 100) / 100,
          startY: Math.round(startY * 100) / 100,
          endX: Math.round(endX * 100) / 100,
          endY: Math.round(endY * 100) / 100,
        });

        log.info('[AutoLevel] Probe area updated from visualizer:', data);
      })
    );

    // Restore probe state if probing was in progress before refresh
    controller.command('autolevel:getProbeState', null, (err, result) => {
      log.info('[AutoLevel] getProbeState callback', { err, result });

      if (err || !result || !result.state) {
        log.warn('[AutoLevel] No probe state to restore:', err);
        return;
      }

      const { probedPositions = [], probePoints = [], minZ, maxZ, config = {} } = result.state;
      log.info('[AutoLevel] Probe state from server:', {
        probedPositions: probedPositions.length,
        probePoints: probePoints.length
      });

      if (probedPositions.length > 0) {
        // Determine if probing was completed or still in progress
        const isCompleted = probedPositions.length >= probePoints.length;
        const wizardView = isCompleted ? VIEW_APPLY : VIEW_PROBING;
        const probeState = isCompleted ? PROBE_STATE_COMPLETED : PROBE_STATE_RUNNING;

        // Restore probe data and show visualization
        this.setState({
          wizardView,
          probeState,
          probedPositions,
          probeStats: {
            points: probedPositions.length,
            minZ,
            maxZ,
            maxDeviation: maxZ - minZ,
          },
          probeProgress: {
            current: probedPositions.length,
            total: probePoints.length,
            percentage: Math.round((probedPositions.length / probePoints.length) * 100),
          },
        });

        // Show visualization
        const { startX, startY, endX, endY } = config;
        if (startX !== undefined && this.state.showProbePreview) {
          pubsub.publish('autolevel:showProbeVisualization', {
            probeData: probedPositions,
            config: { startX, startY, endX, endY, units: this.state.units },
          });
        }

        log.info(`Restored ${probedPositions.length} probe points from server`);
      }
    });
  }

  componentWillUnmount() {
    this.removeControllerEvents();

    // Unsubscribe from pubsub events
    if (this.pubsubTokens) {
      this.pubsubTokens.forEach(token => {
        pubsub.unsubscribe(token);
      });
      this.pubsubTokens = [];
    }
  }

  componentDidUpdate(prevProps, prevState) {
    const {
      minimized,
      stepSize,
      startX, startY, endX, endY,
      clearanceHeight, probeStartZ, probeEndZ,
      probeFeedrate, feedXY,
      wizardView,
      probedPositions,
    } = this.state;

    this.config.set('minimized', minimized);
    this.config.set('stepSize', stepSize);
    this.config.set('startX', startX);
    this.config.set('startY', startY);
    this.config.set('endX', endX);
    this.config.set('endY', endY);
    this.config.set('clearanceHeight', clearanceHeight);
    this.config.set('probeStartZ', probeStartZ);
    this.config.set('probeEndZ', probeEndZ);
    this.config.set('probeFeedrate', probeFeedrate);
    this.config.set('feedXY', feedXY);
    this.config.set('showProbePreview', this.state.showProbePreview);

    // Update 3D visualizer when probe configuration changes in Setup view
    if ((wizardView === VIEW_SETUP_PROBE || wizardView === VIEW_PROBING) && this.state.showProbePreview) {
      const configChanged = (
        prevState.startX !== startX ||
        prevState.startY !== startY ||
        prevState.endX !== endX ||
        prevState.endY !== endY ||
        prevState.stepSize !== stepSize
      );

      if (configChanged || prevState.wizardView !== wizardView) {
        pubsub.publish('autolevel:showProbeVisualization', {
          probeData: probedPositions,
          config: { startX, startY, endX, endY, units: this.state.units },
        });
      }
    }
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
      // Wizard state
      wizardView: VIEW_LANDING,
      // Probe configuration
      stepSize: this.config.get('stepSize', 10),
      startX: this.config.get('startX', 0),
      startY: this.config.get('startY', 0),
      endX: this.config.get('endX', 10),
      endY: this.config.get('endY', 10),
      clearanceHeight: this.config.get('clearanceHeight', 10),
      probeStartZ: this.config.get('probeStartZ', 5),
      probeEndZ: this.config.get('probeEndZ', -5),
      probeFeedrate: this.config.get('probeFeedrate', 5),
      feedXY: this.config.get('feedXY', 1000),
      // Probe state
      probeState: PROBE_STATE_IDLE,
      probeProgress: { current: 0, total: 0, percentage: 0 },
      probedPositions: [],
      probeStats: null,
      probeFileName: '',
      // G-code state
      gcodeApplied: false,
      // UI state
      showProbePreview: this.config.get('showProbePreview', true),
    };
  }

  addControllerEvents() {
    Object.keys(this.controllerEvents).forEach(eventName => {
      const callback = this.controllerEvents[eventName];
      const result = controller.addListener(eventName, callback);
      log.info(`[AutoLevel] Registered listener for '${eventName}':`, result);
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

  renderContent() {
    const { wizardView, modal } = this.state;
    const state = {
      ...this.state,
      canClick: this.canClick()
    };
    const actions = this.actions;

    return (
      <div>
        {modal.name === MODAL_START_PROBE_CONFIRM && (
          <StartProbeModal
            state={state}
            actions={actions}
          />
        )}

        {modal.name === MODAL_STOP_PROBE_CONFIRM && (
          <StopProbeModal
            state={state}
            actions={actions}
          />
        )}

        {wizardView === VIEW_LANDING && (
          <LandingView actions={actions} />
        )}

        {(wizardView === VIEW_SETUP_PROBE || wizardView === VIEW_PROBING) && (
          <SetupProbeView state={state} actions={actions} />
        )}

        {wizardView === VIEW_LOAD_PROBE && (
          <LoadProbeView state={state} actions={actions} />
        )}

        {wizardView === VIEW_APPLY && (
          <ApplyView state={state} actions={actions} />
        )}
      </div>
    );
  }

  render() {
    const { widgetId } = this.props;
    const { minimized, isFullscreen } = this.state;
    const isForkedWidget = widgetId.match(/\w+:[\w\-]+/);
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
            {i18n._('Auto Level')}
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
          {this.renderContent()}
        </Widget.Content>
      </Widget>
    );
  }
}

export default AutoLevelWidget;
