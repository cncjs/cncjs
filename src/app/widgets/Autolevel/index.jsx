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
import TestProbeModal from './TestProbeModal';
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
  MODAL_TEST_PROBE_CONFIRM,
  PROCESSING_PHASE_COMPENSATING,
  PROCESSING_PHASE_LOADING,
} from './constants';
import styles from './index.styl';

class AutolevelWidget extends PureComponent {
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
      const { startX, startY, endX, endY, units, stepSize } = this.state;
      this.setState({ wizardView: VIEW_SETUP_PROBE });

      // Hide any existing probe visualization before re-showing with fresh config.
      // This forces the visualizer to reinitialize the probe area (e.g. after a
      // previous probe run left behind result markers), ensuring a clean slate
      // before the upcoming showProbeVisualization call.
      pubsub.publish('autolevel:hideProbeVisualization');

      // Small delay to ensure the hide event is processed before re-showing.
      setTimeout(() => {
        // Show the probe area boundary in the 3D visualizer using the current
        // form values. interactable:true allows the user to drag/resize the
        // area directly in the viewport while on the Setup Probe view.
        log.debug('Publishing probe visualization', { startX, startY, endX, endY });
        pubsub.publish('autolevel:showProbeVisualization', {
          probeData: [],
          config: { startX, startY, endX, endY, units, snapSize: stepSize / 2, interactable: true },
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

        // A probe file was loaded — display the imported probe points in the
        // 3D visualizer. The bounds are derived from the data itself (min/max
        // of loaded X/Y values). interactable:false because the user is in the
        // Apply view and should not be able to modify the probe area.
        pubsub.publish('autolevel:showProbeVisualization', {
          probeData: probedPositions,
          config: {
            startX: minX,
            startY: minY,
            endX: maxX,
            endY: maxY,
            units: this.state.units,
            snapSize: this.state.stepSize / 2,
            interactable: false,
          },
        });

        log.info(`Loaded ${probedPositions.length} points from ${filepath}`);
      } catch (err) {
        log.error('Error loading probe file:', err);
      }
    },
    backToLanding: () => {
      // Reset all probe-related state to initial values
      this.setState({
        wizardView: VIEW_LANDING,
        probeState: PROBE_STATE_IDLE,
        probeProgress: { current: 0, total: 0, percentage: 0 },
        probedPositions: [], // Clear probe data
        probeStats: null, // Clear probe stats
        probeFileName: '',
        gcodeApplied: false,
        modal: {
          name: MODAL_NONE,
          params: {}
        }
      });

      // The user navigated back to the landing page, resetting all probe state.
      // Remove the probe area overlay from the 3D visualizer since there is no
      // active probe session to display.
      pubsub.publish('autolevel:hideProbeVisualization');
    },
    goToApply: () => {
      this.setState({ wizardView: VIEW_APPLY });

      // Entering the Apply view after a completed probe run — show the collected
      // probe points for reference. interactable:false because the probe area
      // should not be editable from the Apply view.
      const { probedPositions, startX, startY, endX, endY, units, stepSize } = this.state;
      if (probedPositions.length > 0) {
        pubsub.publish('autolevel:showProbeVisualization', {
          probeData: probedPositions,
          config: { startX, startY, endX, endY, units, snapSize: stepSize / 2, interactable: false },
        });
      }
    },

    // Probe configuration handlers
    handleStepSizeChange: (event) => {
      this.setState({ stepSize: Number(event.target.value) });
    },
    handleStepSizeSelect: (size) => {
      this.setState({ stepSize: size });
    },
    handleStartXChange: (event) => {
      this.setState({ startX: this.parseInputValue(event.target.value) });
    },
    handleStartYChange: (event) => {
      this.setState({ startY: this.parseInputValue(event.target.value) });
    },
    handleEndXChange: (event) => {
      this.setState({ endX: this.parseInputValue(event.target.value) });
    },
    handleEndYChange: (event) => {
      this.setState({ endY: this.parseInputValue(event.target.value) });
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
        log.warn('Invalid value entered, restoring previous:', this.previousValidValues[inputName]);
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
      this.setState({ clearanceHeight: this.parseInputValue(event.target.value) });
    },
    handleProbeStartZChange: (event) => {
      this.setState({ probeStartZ: this.parseInputValue(event.target.value) });
    },
    handleProbeEndZChange: (event) => {
      this.setState({ probeEndZ: this.parseInputValue(event.target.value) });
    },
    handleProbeFeedrateChange: (event) => {
      this.setState({ probeFeedrate: this.parseInputValue(event.target.value) });
    },
    handleFeedXYChange: (event) => {
      this.setState({ feedXY: this.parseInputValue(event.target.value) });
    },

    // Probe operations
    showTestProbeConfirmation: () => {
      this.actions.openModal(MODAL_TEST_PROBE_CONFIRM);
    },
    runTestProbe: () => {
      this.actions.closeModal();
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

      // Probing has started — the interactive probe area overlay is no longer
      // needed and would be visually confusing during an active probing run.
      // The visualizer will show probe result markers as points are collected.
      pubsub.publish('autolevel:hideProbeVisualization');

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

      // The user manually stopped an in-progress probe run. Clear the probe
      // area overlay so the visualizer returns to its default state.
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
    applyToGcode: (gcode, gcodeFileName, port, onSuccess, onError, onProgress) => {
      const { probedPositions } = this.state;

      if (onProgress) {
        onProgress(PROCESSING_PHASE_COMPENSATING);
      }

      controller.command('autolevel:applyProbeCompensation', {
        gcode,
        probeData: probedPositions,
      }, (err, result) => {
        if (err) {
          log.error('Error applying auto-level:', err);
          if (onError) {
            onError(String(err));
          }
          return;
        }

        if (!result || !result.compensatedGcode) {
          log.error('Invalid result from compensation:', result);
          if (onError) {
            onError('Invalid compensation result');
          }
          return;
        }

        const { compensatedGcode } = result;

        if (onProgress) {
          onProgress(PROCESSING_PHASE_LOADING);
        }

        // Load compensated G-code to server
        const name = `AL_${gcodeFileName}`;
        api.loadGCode({ port, name, gcode: compensatedGcode })
          .then((res) => {
            const { name: loadedName = '', gcode: loadedGcode = '' } = { ...res.body };
            pubsub.publish('gcode:load', { name: loadedName, gcode: loadedGcode, isAutoLevelled: true });
            this.setState({ gcodeApplied: true });
            log.info('Auto-level applied and G-code loaded to server');

            if (onSuccess) {
              onSuccess(compensatedGcode);
            }
          })
          .catch((error) => {
            log.error('Failed to load compensated G-code to server:', error);
            if (onError) {
              onError('Failed to load compensated G-code to workspace');
            }
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
    resetGcodeApplied: () => {
      this.setState({ gcodeApplied: false });
      log.debug('Reset apply state for new G-code file');
    },
    closeWidget: () => {
      this.setState({
        wizardView: VIEW_LANDING,
        probeState: PROBE_STATE_IDLE,
        probedPositions: [],
        probeStats: null,
        gcodeApplied: false,
      });

      // The widget is being closed/collapsed. Always clean up the probe area
      // overlay so it does not persist in the 3D visualizer after the widget
      // is no longer visible.
      pubsub.publish('autolevel:hideProbeVisualization');
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
      log.debug('Received autolevel:update event', data);
      const { current, total, probedPos, minZ, maxZ, maxDeviation } = data;

      this.setState(state => {
        const updatedPositions = [...state.probedPositions, probedPos];

        // A new probe point was received from the controller (autolevel:update).
        // Incrementally update the 3D visualizer so the user can watch the
        // probe map build in real time. interactable:false — the probe area
        // must not be moved while a probing run is actively in progress.
        const { startX, startY, endX, endY, units, stepSize } = state;
        log.debug(`Updating visualization with point ${current}/${total}:`, probedPos);
        pubsub.publish('autolevel:showProbeVisualization', {
          probeData: updatedPositions,
          config: { startX, startY, endX, endY, units, snapSize: stepSize / 2, interactable: false },
        });

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

        log.debug('Probe area updated from visualizer:', data);
      })
    );

    // Restore probe state if probing was in progress before refresh
    controller.command('autolevel:getProbeState', null, (err, result) => {
      log.debug('getProbeState callback', { err, result });

      if (err || !result || !result.state) {
        log.warn('No probe state to restore:', err);
        return;
      }

      const { probedPositions = [], probePoints = [], minZ, maxZ, config = {} } = result.state;
      log.debug('Probe state from server:', {
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

        // Restore probe visualization after the widget reconnects to the server
        // and recovers an in-progress or completed probe session. interactable
        // is true only when the user is on the Setup Probe view — all other
        // views (Apply, Probing) show the overlay in read-only mode.
        const { startX, startY, endX, endY } = config;
        if (startX !== undefined) {
          const interactable = wizardView === VIEW_SETUP_PROBE;
          pubsub.publish('autolevel:showProbeVisualization', {
            probeData: probedPositions,
            config: { startX, startY, endX, endY, units: this.state.units, snapSize: this.state.stepSize / 2, interactable },
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

    // Only persist valid numeric values to the config store
    const numericFields = {
      startX,
      startY,
      endX,
      endY,
      clearanceHeight,
      probeStartZ,
      probeEndZ,
      probeFeedrate,
      feedXY,
    };
    Object.entries(numericFields).forEach(([key, value]) => {
      if (this.isValidNumber(value)) {
        this.config.set(key, Number(value));
      }
    });

    // Keep the 3D visualizer in sync whenever the probe configuration changes
    // while the user is on the Setup Probe or Probing view. Skipped on other
    // views (Apply, Landing) to avoid unnecessary renders.
    if (wizardView === VIEW_SETUP_PROBE || wizardView === VIEW_PROBING) {
      const configChanged = (
        prevState.startX !== startX ||
        prevState.startY !== startY ||
        prevState.endX !== endX ||
        prevState.endY !== endY ||
        prevState.stepSize !== stepSize
      );

      if (configChanged || prevState.wizardView !== wizardView) {
        // interactable:true only on the Setup Probe view so the user can drag
        // and resize the probe area directly in the viewport. On the Probing
        // view the overlay is read-only (probing is already in progress).
        const interactable = wizardView === VIEW_SETUP_PROBE;
        pubsub.publish('autolevel:showProbeVisualization', {
          probeData: probedPositions,
          config: { startX, startY, endX, endY, units: this.state.units, snapSize: stepSize / 2, interactable },
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
    };
  }

  addControllerEvents() {
    Object.keys(this.controllerEvents).forEach(eventName => {
      const callback = this.controllerEvents[eventName];
      const result = controller.addListener(eventName, callback);
      log.debug(`Registered listener for '${eventName}':`, result);
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

  parseInputValue(raw) {
    const num = Number(raw);
    if (raw !== '' && !Number.isNaN(num)) {
      return num;
    }
    return raw; // Keep as string for intermediate states ('', '-')
  }

  isValidNumber(value) {
    return typeof value === 'number' && !Number.isNaN(value);
  }

  getValidationErrors() {
    const {
      startX, startY, endX, endY,
      clearanceHeight, probeStartZ, probeEndZ,
      probeFeedrate,
    } = this.state;
    const errors = {};
    const invalidMsg = i18n._('Invalid number');

    if (!this.isValidNumber(startX)) {
      errors.startX = invalidMsg;
    }
    if (!this.isValidNumber(startY)) {
      errors.startY = invalidMsg;
    }
    if (!this.isValidNumber(endX)) {
      errors.endX = invalidMsg;
    }
    if (!this.isValidNumber(endY)) {
      errors.endY = invalidMsg;
    }
    if (!this.isValidNumber(clearanceHeight)) {
      errors.clearanceHeight = invalidMsg;
    }
    if (!this.isValidNumber(probeStartZ)) {
      errors.probeStartZ = invalidMsg;
    }
    if (!this.isValidNumber(probeEndZ)) {
      errors.probeEndZ = invalidMsg;
    }
    if (!this.isValidNumber(probeFeedrate)) {
      errors.probeFeedrate = invalidMsg;
    }

    return errors;
  }

  renderContent() {
    const { wizardView, modal } = this.state;
    const validationErrors = this.getValidationErrors();
    const hasValidationErrors = Object.keys(validationErrors).length > 0;
    const state = {
      ...this.state,
      canClick: this.canClick() && !hasValidationErrors,
      validationErrors,
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

        {modal.name === MODAL_TEST_PROBE_CONFIRM && (
          <TestProbeModal
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
            {i18n._('Autolevel')}
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

export default AutolevelWidget;
