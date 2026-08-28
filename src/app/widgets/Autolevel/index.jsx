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
import { in2mm, mapValueToUnits } from 'app/lib/units';
import WidgetConfig from '../WidgetConfig';
import LandingView from './LandingView';
import SetupProbeView from './SetupProbeView';
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
      const { startX, startY, endX, endY, units, stepX, stepY } = this.state;
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
          config: { startX, startY, endX, endY, units, snapX: stepX / 2, snapY: stepY / 2, interactable: true },
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
            snapX: this.state.stepX / 2,
            snapY: this.state.stepY / 2,
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
      const { probedPositions, startX, startY, endX, endY, units, stepX, stepY } = this.state;
      if (probedPositions.length > 0) {
        pubsub.publish('autolevel:showProbeVisualization', {
          probeData: probedPositions,
          config: { startX, startY, endX, endY, units, snapX: stepX / 2, snapY: stepY / 2, interactable: false },
        });
      }
    },

    // Probe configuration handlers
    handleStepXChange: (event) => {
      this.setState({ stepX: this.parseInputValue(event.target.value) });
    },
    handleStepYChange: (event) => {
      this.setState({ stepY: this.parseInputValue(event.target.value) });
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
    handleClearanceZChange: (event) => {
      this.setState({ clearanceZ: this.parseInputValue(event.target.value) });
    },
    handleStartZChange: (event) => {
      this.setState({ startZ: this.parseInputValue(event.target.value) });
    },
    handleEndZChange: (event) => {
      this.setState({ endZ: this.parseInputValue(event.target.value) });
    },
    handleProbeFeedrateChange: (event) => {
      this.setState({ feedrate: this.parseInputValue(event.target.value) });
    },
    handleSkipUnprobedChange: (event) => {
      this.setState({ skipUnprobed: event.target.checked });
    },

    // Probe operations
    showTestProbeConfirmation: () => {
      this.actions.openModal(MODAL_TEST_PROBE_CONFIRM);
    },
    startTestProbe: () => {
      this.actions.closeModal();
      const { clearanceZ, startZ, endZ, feedrate } = this.state;
      // Test mode: single probe at current XY, no probe results generated
      controller.command('autolevel:start', {
        mode: 'test',
        clearanceZ,
        startZ,
        endZ,
        feedrate,
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
        startX, endX, stepX,
        startY, endY, stepY,
        clearanceZ, startZ, endZ,
        feedrate,
        skipUnprobed,
      } = this.state;

      this.actions.closeModal();
      this.setState({ probeErrorMessage: '' });

      // The probing state is not set here. The controller can refuse this
      // start — a run already in progress, an alarm, an empty area — and the
      // refusal is broadcast to every connected client, so a widget that had
      // already declared itself to be probing could not tell its own refusal
      // from one provoked by another tab. 'autolevel:started' is what says the
      // run exists, and it brings the point count with it.

      // Values are in the current display units (G20/G21) — the server
      // passes them directly into G-code without unit conversion
      controller.command('autolevel:start', {
        mode: 'full',
        startX,
        endX,
        stepX,
        startY,
        endY,
        stepY,
        clearanceZ,
        startZ,
        endZ,
        feedrate,
        skipUnprobed,
      });

      log.info('Starting probe sequence');
    },
    stopProbing: () => {
      this.actions.closeModal();
      this.setState({
        probeState: PROBE_STATE_STOPPED,
      });

      // Stop probing: reset machine and clear probe state on the server
      controller.command('autolevel:stop');

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
            pubsub.publish('gcode:load', { name: loadedName, gcode: loadedGcode, isProbeCompensationApplied: true });
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

      if (this.state.units !== units) {
        this.unitsDidChange = true;
      }

      this.setState({
        units: units,
        controller: { type, state: controllerState },
        stepX: mapValueToUnits(this.config.get('stepX', 10), units),
        stepY: mapValueToUnits(this.config.get('stepY', 10), units),
        startX: mapValueToUnits(this.config.get('startX', 0), units),
        startY: mapValueToUnits(this.config.get('startY', 0), units),
        endX: mapValueToUnits(this.config.get('endX', 10), units),
        endY: mapValueToUnits(this.config.get('endY', 10), units),
        clearanceZ: mapValueToUnits(this.config.get('clearanceZ', 10), units),
        startZ: mapValueToUnits(this.config.get('startZ', 5), units),
        endZ: mapValueToUnits(this.config.get('endZ', -5), units),
        feedrate: mapValueToUnits(this.config.get('feedrate', 5), units),
        skipUnprobed: this.config.get('skipUnprobed', false),
      });
    },
    'autolevel:started': ({ total }) => {
      log.info(`Probing run started with ${total} points`);

      // The interactive probe area overlay is no longer needed and would be
      // visually confusing during an active run. The visualizer shows probe
      // result markers as points are collected.
      pubsub.publish('autolevel:hideProbeVisualization');

      this.setState({
        probeState: PROBE_STATE_RUNNING,
        probeErrorMessage: '',
        probedPositions: [],
        probeMarkers: [],
        probeProgress: {
          current: 0,
          total,
          percentage: 0,
          skipped: 0,
          retried: 0,
        },
      });
    },
    'autolevel:update': (data) => {
      log.debug('Received autolevel:update event', data);
      const { current, total, probedPos, measuredPos, wasRetry, skippedPoint, skippedCount = 0, retriedCount = 0, minZ, maxZ, maxDeviation } = data;

      this.setState(state => {
        // probedPos is null when the controller skipped a point with no
        // contact (skipUnprobed); the compensation grid only ever sees
        // real measurements, stored at their grid node's XY.
        const updatedPositions = probedPos
          ? [...state.probedPositions, probedPos]
          : state.probedPositions;

        // Markers tell the visual truth the grid cannot: where a nearby
        // retry REALLY touched, and which nodes found nothing at all.
        let updatedMarkers = state.probeMarkers;
        if (wasRetry) {
          updatedMarkers = [...updatedMarkers, { type: 'retried', ...measuredPos, nodeX: probedPos.x, nodeY: probedPos.y }];
        } else if (skippedPoint) {
          updatedMarkers = [...updatedMarkers, { type: 'skipped', x: skippedPoint.x, y: skippedPoint.y, z: 0 }];
        }

        // A new probe point was received from the controller (autolevel:update).
        // Incrementally update the 3D visualizer so the user can watch the
        // probe map build in real time. interactable:false — the probe area
        // must not be moved while a probing run is actively in progress.
        const { startX, startY, endX, endY, units, stepX, stepY } = state;
        log.debug(`Updating visualization with point ${current}/${total}:`, probedPos);
        pubsub.publish('autolevel:showProbeVisualization', {
          probeData: updatedPositions,
          probeMarkers: updatedMarkers,
          config: { startX, startY, endX, endY, units, snapX: stepX / 2, snapY: stepY / 2, interactable: false },
        });

        return {
          probedPositions: updatedPositions,
          probeMarkers: updatedMarkers,
          probeProgress: {
            current,
            total,
            percentage: Math.round((current / total) * 100),
            skipped: skippedCount,
            retried: retriedCount,
          },
          probeStats: {
            points: updatedPositions.length,
            skipped: skippedCount,
            retried: retriedCount,
            minZ,
            maxZ,
            maxDeviation,
          },
        };
      });

      log.debug(`Probed ${current}/${total} points`);
    },
    'autolevel:error': ({ reason, rejected = false, current, total, point, probedPositions = [], skippedPoints = [] }) => {
      // `rejected` means the controller turned down a start request; nothing
      // that was running stopped. The refusal still reaches every client,
      // because the controller has no socket to answer, so a widget watching a
      // live run must not read it as that run ending: it would drop the
      // progress bar, put the Start button back in place of Stop, and invite
      // the user to press Stop on a machine that is probing correctly.
      if (rejected) {
        const message = i18n._('Probing did not start: {{reason}}', { reason });
        log.error(message);
        if (this.state.probeState !== PROBE_STATE_RUNNING) {
          this.setState({ probeErrorMessage: message });
        }
        return;
      }

      // The run is over and the controller will not send another probe. Say
      // where it stopped: with a partial map the numbers are the only clue to
      // which grid node was the problem.
      const where = point
        ? i18n._('Probing stopped at point {{current}}/{{total}} (X{{x}} Y{{y}}): {{reason}}',
          { current: current + 1, total, x: point.x, y: point.y, reason })
        : i18n._('Probing stopped at point {{current}}/{{total}}: {{reason}}',
          { current: current + 1, total, reason });

      log.error(where);
      this.setState(state => ({
        probeState: PROBE_STATE_STOPPED,
        probeErrorMessage: where,
        // Measurements taken before the abort are worth machine hours, so the
        // controller sends them along. A client that watched the whole run
        // already collected them from autolevel:update; one that joined mid-run
        // (a reload, a second tab) never saw those events and this payload is
        // the only copy it has.
        probedPositions: (state.probedPositions.length > 0) ? state.probedPositions : probedPositions,
        probeMarkers: (state.probeMarkers.length > 0)
          ? state.probeMarkers
          : skippedPoints.map(({ x, y }) => ({ type: 'skipped', x, y, z: 0 })),
      }));
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

      const { probedPositions = [], probePoints = [], attempted = 0, skippedPoints = [], retriedCount = 0, minZ, maxZ, config = {}, abortReason = null, abortedAt = 0 } = result.state;
      log.debug('Probe state from server:', {
        probedPositions: probedPositions.length,
        probePoints: probePoints.length
      });

      if (probedPositions.length > 0) {
        // Determine if probing was completed or still in progress. Progress is
        // measured in resolved grid points, not in measurements: a point that
        // found no contact is resolved too, and counting measurements would
        // leave a finished run looking stuck one short of its last point.
        // A run that was aborted keeps its measurements on the server and its
        // cursor at the end of the grid, so it reads as resolved -- which it
        // is, there is no probe still coming. What it is not is complete, and
        // the map has holes the user has to know about before applying it.
        const isCompleted = attempted >= probePoints.length;
        const wizardView = isCompleted ? VIEW_APPLY : VIEW_PROBING;
        const probeState = isCompleted ? PROBE_STATE_COMPLETED : PROBE_STATE_RUNNING;
        // abortedAt, not attempted: the abort parks the cursor at the end of
        // the grid to close the run, so attempted would report the last point
        // as the one that failed.
        const probeErrorMessage = abortReason
          ? i18n._('Probing stopped at point {{current}}/{{total}}: {{reason}}',
            { current: abortedAt + 1, total: probePoints.length, reason: abortReason })
          : '';
        // Where a retry really touched is not kept across a reconnect, but the
        // points that found nothing are.
        const probeMarkers = skippedPoints.map(({ x, y }) => ({ type: 'skipped', x, y, z: 0 }));

        // Restore probe data and show visualization
        this.setState({
          wizardView,
          probeState,
          probeErrorMessage,
          probedPositions,
          probeMarkers,
          probeStats: {
            points: probedPositions.length,
            skipped: skippedPoints.length,
            retried: retriedCount,
            minZ,
            maxZ,
            maxDeviation: maxZ - minZ,
          },
          probeProgress: {
            current: attempted,
            total: probePoints.length,
            percentage: Math.round((attempted / probePoints.length) * 100),
            skipped: skippedPoints.length,
            retried: retriedCount,
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
            probeMarkers,
            config: { startX, startY, endX, endY, units: this.state.units, snapX: this.state.stepX / 2, snapY: this.state.stepY / 2, interactable },
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

  unitsDidChange = false;

  componentDidUpdate(prevProps, prevState) {
    const {
      skipUnprobed,
      minimized, units, wizardView, probedPositions,
      stepX, stepY,
      startX, startY, endX, endY,
      clearanceZ, startZ, endZ,
      feedrate,
    } = this.state;

    this.config.set('minimized', minimized);

    // Do not save config settings if the units just changed between in and mm
    if (this.unitsDidChange) {
      this.unitsDidChange = false;
      return;
    }

    // Save in mm
    const toMetric = (value) => Number((units === IMPERIAL_UNITS) ? in2mm(value) : value);
    this.config.set('stepX', toMetric(stepX));
    this.config.set('stepY', toMetric(stepY));
    this.config.set('startX', toMetric(startX));
    this.config.set('startY', toMetric(startY));
    this.config.set('endX', toMetric(endX));
    this.config.set('endY', toMetric(endY));
    this.config.set('clearanceZ', toMetric(clearanceZ));
    this.config.set('startZ', toMetric(startZ));
    this.config.set('endZ', toMetric(endZ));
    this.config.set('feedrate', toMetric(feedrate));
    this.config.set('skipUnprobed', !!skipUnprobed);

    // Keep the 3D visualizer in sync whenever the probe configuration changes
    // while the user is on the Setup Probe or Probing view. Skipped on other
    // views (Apply, Landing) to avoid unnecessary renders.
    if (wizardView === VIEW_SETUP_PROBE || wizardView === VIEW_PROBING) {
      const configChanged = (
        prevState.startX !== startX ||
        prevState.startY !== startY ||
        prevState.endX !== endX ||
        prevState.endY !== endY ||
        prevState.stepX !== stepX ||
        prevState.stepY !== stepY
      );

      if (configChanged || prevState.wizardView !== wizardView) {
        // interactable:true only on the Setup Probe view so the user can drag
        // and resize the probe area directly in the viewport. On the Probing
        // view the overlay is read-only (probing is already in progress).
        const interactable = wizardView === VIEW_SETUP_PROBE;
        pubsub.publish('autolevel:showProbeVisualization', {
          probeData: probedPositions,
          config: { startX, startY, endX, endY, units: this.state.units, snapX: stepX / 2, snapY: stepY / 2, interactable },
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
      stepX: this.config.get('stepX', 10),
      stepY: this.config.get('stepY', 10),
      startX: this.config.get('startX', 0),
      startY: this.config.get('startY', 0),
      endX: this.config.get('endX', 100),
      endY: this.config.get('endY', 100),
      clearanceZ: this.config.get('clearanceZ', 5),
      startZ: this.config.get('startZ', 5),
      endZ: this.config.get('endZ', -5),
      feedrate: this.config.get('feedrate', 25),
      // Seeded from config like every field above it. Left undefined, the
      // first componentDidUpdate -- which runs long before the first
      // 'controller:state' brings the saved value in -- would persist
      // `!!undefined` and wipe the user's saved preference.
      skipUnprobed: this.config.get('skipUnprobed', false),
      // Probe state
      probeState: PROBE_STATE_IDLE,
      probeProgress: { current: 0, total: 0, percentage: 0 },
      probedPositions: [],
      // Where a nearby retry really touched, and which nodes found nothing.
      probeMarkers: [],
      probeErrorMessage: '',
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
      stepX, stepY,
      clearanceZ, startZ, endZ,
      feedrate,
    } = this.state;
    const errors = {};
    const invalidMsg = i18n._('Must be a number');
    const positiveMsg = i18n._('Must be greater than zero');

    if (!this.isValidNumber(startX)) {
      errors.startX = invalidMsg;
    }
    if (!this.isValidNumber(startY)) {
      errors.startY = invalidMsg;
    }
    // An end at or before the start is not a probe area: the grid comes out
    // empty (or one point wide, which cannot describe a surface), and the
    // controller has nothing to probe.
    if (!this.isValidNumber(endX)) {
      errors.endX = invalidMsg;
    } else if (this.isValidNumber(startX) && endX <= startX) {
      errors.endX = i18n._('Must be greater than the start');
    }
    if (!this.isValidNumber(endY)) {
      errors.endY = invalidMsg;
    } else if (this.isValidNumber(startY) && endY <= startY) {
      errors.endY = i18n._('Must be greater than the start');
    }
    if (!this.isValidNumber(stepX)) {
      errors.stepX = invalidMsg;
    } else if (stepX <= 0) {
      errors.stepX = positiveMsg;
    }
    if (!this.isValidNumber(stepY)) {
      errors.stepY = invalidMsg;
    } else if (stepY <= 0) {
      errors.stepY = positiveMsg;
    }
    if (!this.isValidNumber(clearanceZ)) {
      errors.clearanceZ = invalidMsg;
    } else if (clearanceZ <= startZ) {
      errors.clearanceZ = i18n._('Clearance Z must be above Start Z');
    }
    if (!this.isValidNumber(startZ)) {
      errors.startZ = invalidMsg;
    }
    // The probe descends from Start Z to End Z. With End Z at or above it
    // there is nowhere to descend to, and Grbl answers the probe line with
    // error:33 (invalid target) -- no probe result, no alarm, just a run that
    // never produces its first measurement.
    if (!this.isValidNumber(endZ)) {
      errors.endZ = invalidMsg;
    } else if (this.isValidNumber(startZ) && endZ >= startZ) {
      errors.endZ = i18n._('Must be below Start Z');
    }
    // A probe at F0 never moves; Grbl rejects the line the same way.
    if (!this.isValidNumber(feedrate)) {
      errors.feedrate = invalidMsg;
    } else if (feedrate <= 0) {
      errors.feedrate = positiveMsg;
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
