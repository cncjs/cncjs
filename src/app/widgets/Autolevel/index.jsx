import {
  Box,
  Button,
  Dropdown,
  DropdownButton,
  Space,
} from '@tonic-ui/react';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CloseIcon,
  MenuIcon,
  MoreIcon,
} from '@tonic-ui/react-icons';
import { faCodeBranch, faCompress, faExpand } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import get from 'lodash/get';
import includes from 'lodash/includes';
import pubsub from 'pubsub-js';
import React, { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { useLoadGCodeMutation } from '@app/queries/gcode';
import WidgetConfig from '@app/widgets/shared/WidgetConfig';
import controller from '@app/lib/controller';
import i18n from '@app/lib/i18n';
import log from '@app/lib/log';
import { in2mm, mapValueToUnits } from '@app/lib/units';
import {
  IMPERIAL_UNITS,
  METRIC_UNITS,
} from '@app/constants';
import {
  GRBL,
  GRBL_MACHINE_STATE_IDLE,
  MARLIN,
  SMOOTHIE,
  SMOOTHIE_MACHINE_STATE_IDLE,
  TINYG,
  TINYG_MACHINE_STATE_END,
  TINYG_MACHINE_STATE_READY,
  TINYG_MACHINE_STATE_STOP,
} from '@app/constants/controller';
import { WORKFLOW_STATE_IDLE } from '@app/constants/workflow';
import LandingView from './LandingView';
import SetupProbeView from './SetupProbeView';
import ApplyView from './ApplyView';
import StartProbeModal from './StartProbeModal';
import StopProbeModal from './StopProbeModal';
import TestProbeModal from './TestProbeModal';
import { SCAN_DIRECTIONS, SCAN_PATTERNS, getScanPointCount } from './scanPath';
import {
  VIEW_APPLY,
  VIEW_LANDING,
  VIEW_PROBING,
  VIEW_SETUP_PROBE,
  MODAL_NONE,
  MODAL_START_PROBE_CONFIRM,
  MODAL_STOP_PROBE_CONFIRM,
  MODAL_TEST_PROBE_CONFIRM,
  PROCESSING_PHASE_COMPENSATING,
  PROCESSING_PHASE_LOADING,
  PROBE_STATE_COMPLETED,
  PROBE_STATE_IDLE,
  PROBE_STATE_RUNNING,
  PROBE_STATE_STOPPED,
} from './constants';

const PROBE_SETTING_KEYS = [
  'stepX',
  'stepY',
  'startX',
  'startY',
  'endX',
  'endY',
  'clearanceZ',
  'startZ',
  'endZ',
  'feedrate',
];

const VISUALIZER_CONFIG_KEYS = new Set([
  'stepX',
  'stepY',
  'startX',
  'startY',
  'endX',
  'endY',
  'scanPattern',
  'scanDirection',
]);

const noop = () => {};

const readProbeSettings = (config, units) => PROBE_SETTING_KEYS.reduce((settings, key) => {
  const defaults = {
    stepX: 10,
    stepY: 10,
    startX: 0,
    startY: 0,
    endX: 100,
    endY: 100,
    clearanceZ: 5,
    startZ: 5,
    endZ: -5,
    feedrate: 25,
  };
  settings[key] = mapValueToUnits(config.get(key, defaults[key]), units);
  return settings;
}, {});

const readScanSettings = config => {
  const scanPattern = config.get('scanPattern', 'raster');
  const scanDirection = config.get('scanDirection', 'x');
  return {
    scanPattern: SCAN_PATTERNS.includes(scanPattern) ? scanPattern : 'raster',
    scanDirection: SCAN_DIRECTIONS.includes(scanDirection) ? scanDirection : 'x',
  };
};

const createInitialState = ({ widgetConfig, controllerClient }) => ({
  connected: !!get(controllerClient, 'connection.ident'),
  units: METRIC_UNITS,
  controller: {
    type: controllerClient.type,
    state: controllerClient.state,
  },
  workflow: {
    state: get(controllerClient, 'workflow.state', WORKFLOW_STATE_IDLE),
  },
  modal: {
    name: MODAL_NONE,
    params: {},
  },
  wizardView: VIEW_LANDING,
  ...readProbeSettings(widgetConfig, METRIC_UNITS),
  ...readScanSettings(widgetConfig),
  probeState: PROBE_STATE_IDLE,
  probeProgress: { current: 0, total: 0, percentage: 0 },
  probedPositions: [],
  probeStats: null,
  probeFileName: '',
  gcodeApplied: false,
});

const autolevelReducer = (state, action) => {
  switch (action.type) {
  case 'SET_RUNTIME':
    return { ...state, ...action.payload };
  case 'OPEN_MODAL':
    return { ...state, modal: { name: action.payload.name, params: action.payload.params || {} } };
  case 'CLOSE_MODAL':
    return { ...state, modal: { name: MODAL_NONE, params: {} } };
  case 'START_SETUP':
    return { ...state, wizardView: VIEW_SETUP_PROBE };
  case 'SET_FIELD':
    return { ...state, [action.payload.field]: action.payload.value };
  case 'START_PROBING':
    return {
      ...state,
      wizardView: VIEW_PROBING,
      probeState: PROBE_STATE_RUNNING,
      probedPositions: [],
      probeProgress: { current: 0, total: action.payload.totalPoints, percentage: 0 },
      probeStats: null,
      gcodeApplied: false,
      modal: { name: MODAL_NONE, params: {} },
    };
  case 'UPDATE_PROBE': {
    if (state.probeState !== PROBE_STATE_RUNNING || !action.payload.probedPos) {
      return state;
    }
    const { current, total, probedPos, minZ, maxZ, maxDeviation } = action.payload;
    const probedPositions = [...state.probedPositions, probedPos];
    return {
      ...state,
      probedPositions,
      probeProgress: {
        current,
        total,
        percentage: total ? Math.round((current / total) * 100) : 0,
      },
      probeStats: {
        points: current,
        minZ,
        maxZ,
        maxDeviation,
      },
    };
  }
  case 'STOP_PROBING':
    return {
      ...state,
      probeState: PROBE_STATE_STOPPED,
      modal: { name: MODAL_NONE, params: {} },
    };
  case 'COMPLETE_PROBING':
    return {
      ...state,
      probeState: PROBE_STATE_COMPLETED,
      wizardView: VIEW_APPLY,
      modal: { name: MODAL_NONE, params: {} },
    };
  case 'AREA_UPDATED':
    return {
      ...state,
      startX: Math.round(action.payload.startX * 100) / 100,
      startY: Math.round(action.payload.startY * 100) / 100,
      endX: Math.round(action.payload.endX * 100) / 100,
      endY: Math.round(action.payload.endY * 100) / 100,
    };
  case 'RESTORE_PROBE':
    return { ...state, ...action.payload };
  case 'RESET':
    return {
      ...state,
      wizardView: VIEW_LANDING,
      probeState: PROBE_STATE_IDLE,
      probeProgress: { current: 0, total: 0, percentage: 0 },
      probedPositions: [],
      probeStats: null,
      probeFileName: '',
      gcodeApplied: false,
      modal: { name: MODAL_NONE, params: {} },
    };
  case 'SET_GCODE_APPLIED':
    return { ...state, gcodeApplied: action.payload };
  default:
    return state;
  }
};

const parseInputValue = raw => {
  const num = Number(raw);
  if (raw !== '' && !Number.isNaN(num)) {
    return num;
  }
  return raw;
};

const isValidNumber = value => typeof value === 'number' && Number.isFinite(value);

const getValidationErrors = state => {
  const { clearanceZ, startZ } = state;
  const errors = {};
  const invalidMessage = i18n._('Must be a number');
  const positiveMessage = i18n._('Must be greater than zero');

  ['startX', 'startY', 'endX', 'endY', 'startZ', 'endZ', 'feedrate'].forEach(key => {
    if (!isValidNumber(state[key])) {
      errors[key] = invalidMessage;
    }
  });
  if (isValidNumber(state.startX) && isValidNumber(state.endX) && state.endX < state.startX) {
    errors.endX = i18n._('End X must be greater than or equal to Start X');
  }
  if (isValidNumber(state.startY) && isValidNumber(state.endY) && state.endY < state.startY) {
    errors.endY = i18n._('End Y must be greater than or equal to Start Y');
  }
  ['stepX', 'stepY'].forEach(key => {
    if (!isValidNumber(state[key])) {
      errors[key] = invalidMessage;
    } else if (state[key] <= 0) {
      errors[key] = positiveMessage;
    }
  });
  if (!isValidNumber(clearanceZ)) {
    errors.clearanceZ = invalidMessage;
  } else if (isValidNumber(startZ) && clearanceZ <= startZ) {
    errors.clearanceZ = i18n._('Clearance Z must be above Start Z');
  }
  return errors;
};

const canClickForState = state => {
  const { connected, workflow, controller: controllerInfo } = state;
  const controllerType = controllerInfo.type;
  const controllerState = controllerInfo.state;
  if (!connected || workflow.state !== WORKFLOW_STATE_IDLE) {
    return false;
  }
  if (!includes([GRBL, MARLIN, SMOOTHIE, TINYG], controllerType)) {
    return false;
  }
  if (controllerType === GRBL && !includes([GRBL_MACHINE_STATE_IDLE], get(controllerState, 'status.machineState'))) {
    return false;
  }
  if (controllerType === SMOOTHIE && !includes([SMOOTHIE_MACHINE_STATE_IDLE], get(controllerState, 'status.machineState'))) {
    return false;
  }
  if (controllerType === TINYG && !includes([
    TINYG_MACHINE_STATE_READY,
    TINYG_MACHINE_STATE_STOP,
    TINYG_MACHINE_STATE_END,
  ], get(controllerState, 'machineState'))) {
    return false;
  }
  return true;
};

const readControllerUnits = (type, controllerState, fallback) => {
  let modal = get(controllerState, 'parserstate.modal', {});
  if (type === TINYG) {
    modal = get(controllerState, 'sr.modal', {});
  } else if (type === MARLIN) {
    modal = get(controllerState, 'modal', {});
  }
  return {
    G20: IMPERIAL_UNITS,
    G21: METRIC_UNITS,
  }[modal.units] || fallback;
};

const toMetric = (value, units) => Number(units === IMPERIAL_UNITS ? in2mm(value) : value);

/**
 * @param {{widgetId: string, onFork?: Function, onRemove?: Function, view: string, onViewChange: Function, sortable?: object}} props
 */
function AutolevelWidget({
  widgetId,
  onFork = noop,
  onRemove = noop,
  view,
  onViewChange = noop,
  sortable = {},
}) {
  const widgetConfig = useMemo(() => new WidgetConfig(widgetId), [widgetId]);
  const [state, dispatch] = useReducer(
    autolevelReducer,
    { widgetConfig, controllerClient: controller },
    createInitialState,
  );
  const stateRef = useRef(state);
  const mountedRef = useRef(false);
  const delayedVisualizationRef = useRef(null);
  const previousValidValuesRef = useRef({});
  const persistedUnitsRef = useRef(state.units);
  const loadGCodeMutation = useLoadGCodeMutation();

  stateRef.current = state;

  const transition = useCallback(action => {
    stateRef.current = autolevelReducer(stateRef.current, action);
    dispatch(action);
  }, []);

  const publishProbeArea = useCallback((nextState, interactable) => {
    pubsub.publish('autolevel:showProbeVisualization', {
      probeData: nextState.probedPositions,
      config: {
        startX: nextState.startX,
        startY: nextState.startY,
        endX: nextState.endX,
        endY: nextState.endY,
        units: nextState.units,
        snapX: nextState.stepX / 2,
        snapY: nextState.stepY / 2,
        stepX: nextState.stepX,
        stepY: nextState.stepY,
        scanPattern: nextState.scanPattern,
        scanDirection: nextState.scanDirection,
        interactable,
      },
    });
  }, []);

  const publishProbeAreaForView = useCallback(nextState => {
    if (nextState.wizardView === VIEW_SETUP_PROBE || nextState.wizardView === VIEW_PROBING ||
        (nextState.wizardView === VIEW_APPLY && nextState.probedPositions.length > 0)) {
      publishProbeArea(nextState, nextState.wizardView === VIEW_SETUP_PROBE);
    }
  }, [publishProbeArea]);

  useEffect(() => {
    mountedRef.current = true;
    const onConnectionOpen = () => transition({ type: 'SET_RUNTIME', payload: { connected: true } });
    const onConnectionChange = (_connectionState, connected) => {
      const wasRunning = stateRef.current.probeState === PROBE_STATE_RUNNING;
      let nextProbeState = stateRef.current.probeState;
      if (!connected && wasRunning) {
        nextProbeState = PROBE_STATE_STOPPED;
      }
      transition({
        type: 'SET_RUNTIME',
        payload: {
          connected: !!connected,
          probeState: nextProbeState,
        },
      });
      if (!connected && wasRunning) {
        pubsub.publish('autolevel:hideProbeVisualization');
      }
    };
    const onConnectionError = () => {
      const wasRunning = stateRef.current.probeState === PROBE_STATE_RUNNING;
      transition({
        type: 'SET_RUNTIME',
        payload: {
          connected: false,
          probeState: wasRunning ? PROBE_STATE_STOPPED : stateRef.current.probeState,
        },
      });
      if (wasRunning) {
        pubsub.publish('autolevel:hideProbeVisualization');
      }
    };
    const onWorkflowState = workflowState => transition({
      type: 'SET_RUNTIME',
      payload: { workflow: { state: workflowState } },
    });
    const onControllerState = (type, controllerState) => {
      const units = readControllerUnits(type, controllerState, stateRef.current.units);
      const action = {
        type: 'SET_RUNTIME',
        payload: {
          units,
          controller: { type, state: controllerState },
          ...readProbeSettings(widgetConfig, units),
          ...readScanSettings(widgetConfig),
        },
      };
      const nextState = autolevelReducer(stateRef.current, action);
      stateRef.current = nextState;
      dispatch(action);
      publishProbeAreaForView(nextState);
    };
    const onProbeUpdate = data => {
      const nextState = autolevelReducer(stateRef.current, { type: 'UPDATE_PROBE', payload: data });
      if (nextState === stateRef.current) {
        return;
      }
      stateRef.current = nextState;
      dispatch({ type: 'UPDATE_PROBE', payload: data });
      publishProbeArea(nextState, false);
    };
    const onProbeComplete = () => {
      const action = { type: 'COMPLETE_PROBING' };
      const nextState = autolevelReducer(stateRef.current, action);
      transition(action);
      publishProbeAreaForView(nextState);
    };
    const onProbeAreaUpdated = (_message, data = {}) => {
      if (['startX', 'startY', 'endX', 'endY'].every(key => isValidNumber(data[key]))) {
        const action = { type: 'AREA_UPDATED', payload: data };
        const nextState = autolevelReducer(stateRef.current, action);
        stateRef.current = nextState;
        dispatch(action);
        publishProbeAreaForView(nextState);
      }
    };

    const controllerEvents = {
      'connection:open': onConnectionOpen,
      'connection:change': onConnectionChange,
      'connection:error': onConnectionError,
      disconnect: onConnectionError,
      'connection:close': onConnectionError,
      'workflow:state': onWorkflowState,
      'controller:state': onControllerState,
      'autolevel:update': onProbeUpdate,
      'autolevel:complete': onProbeComplete,
    };
    Object.entries(controllerEvents).forEach(([name, listener]) => controller.addListener(name, listener));
    const areaToken = pubsub.subscribe('autolevel:probeAreaUpdated', onProbeAreaUpdated);

    controller.command('autolevel:getProbeState', null, (_error, result) => {
      if (!mountedRef.current || !result || !result.state) {
        return;
      }
      const { probedPositions = [], probePoints = [], minZ, maxZ, config = {} } = result.state;
      if (!probedPositions.length) {
        return;
      }
      const completed = probedPositions.length >= probePoints.length;
      const wizardView = completed ? VIEW_APPLY : VIEW_PROBING;
      const restoredState = {
        wizardView,
        probeState: completed ? PROBE_STATE_COMPLETED : PROBE_STATE_RUNNING,
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
          percentage: probePoints.length ? Math.round((probedPositions.length / probePoints.length) * 100) : 0,
        },
      };
      transition({ type: 'RESTORE_PROBE', payload: restoredState });
      if (config.startX !== undefined) {
        publishProbeArea({ ...stateRef.current, ...restoredState, ...config }, wizardView === VIEW_SETUP_PROBE);
      }
    });

    return () => {
      mountedRef.current = false;
      if (delayedVisualizationRef.current) {
        clearTimeout(delayedVisualizationRef.current);
        delayedVisualizationRef.current = null;
      }
      Object.entries(controllerEvents).forEach(([name, listener]) => controller.removeListener(name, listener));
      pubsub.unsubscribe(areaToken);
    };
  }, [dispatch, publishProbeArea, publishProbeAreaForView, transition, widgetConfig]);

  useEffect(() => {
    if (persistedUnitsRef.current !== state.units) {
      persistedUnitsRef.current = state.units;
      return;
    }
    PROBE_SETTING_KEYS.forEach(key => {
      widgetConfig.set(key, toMetric(state[key], state.units));
    });
    widgetConfig.set('scanPattern', state.scanPattern);
    widgetConfig.set('scanDirection', state.scanDirection);
    persistedUnitsRef.current = state.units;
  }, [state, widgetConfig]);

  const openModal = useCallback((name, params = {}) => {
    transition({ type: 'OPEN_MODAL', payload: { name, params } });
  }, [transition]);

  const closeModal = useCallback(() => transition({ type: 'CLOSE_MODAL' }), [transition]);

  const startNewProbe = useCallback(() => {
    transition({ type: 'START_SETUP' });
    pubsub.publish('autolevel:hideProbeVisualization');
    if (delayedVisualizationRef.current) {
      clearTimeout(delayedVisualizationRef.current);
    }
    delayedVisualizationRef.current = setTimeout(() => {
      if (mountedRef.current) {
        publishProbeAreaForView(stateRef.current);
      }
      delayedVisualizationRef.current = null;
    }, 50);
  }, [publishProbeAreaForView, transition]);

  const handleProbeFileLoaded = useCallback((filepath, data) => {
    try {
      const probedPositions = data.split('\n')
        .filter(line => line.trim().length > 0)
        .map(line => line.trim().split(/\s+/).map(Number))
        .filter(values => values.slice(0, 3).every(value => !Number.isNaN(value)))
        .map(([x, y, z]) => ({ x, y, z }));
      const zValues = probedPositions.map(({ z }) => z);
      const xValues = probedPositions.map(({ x }) => x);
      const yValues = probedPositions.map(({ y }) => y);
      const minZ = zValues.length ? Math.min(...zValues) : Infinity;
      const maxZ = zValues.length ? Math.max(...zValues) : -Infinity;
      const nextState = {
        ...stateRef.current,
        wizardView: VIEW_APPLY,
        probeFileName: filepath,
        probedPositions,
        probeStats: {
          points: probedPositions.length,
          minZ,
          maxZ,
          maxDeviation: maxZ - minZ,
        },
      };
      transition({ type: 'RESTORE_PROBE', payload: nextState });
      publishProbeArea({
        ...nextState,
        startX: xValues.length ? Math.min(...xValues) : nextState.startX,
        startY: yValues.length ? Math.min(...yValues) : nextState.startY,
        endX: xValues.length ? Math.max(...xValues) : nextState.endX,
        endY: yValues.length ? Math.max(...yValues) : nextState.endY,
      }, false);
      log.info(`Loaded ${probedPositions.length} points from ${filepath}`);
    } catch (error) {
      log.error('Error loading probe file:', error);
    }
  }, [publishProbeArea, transition]);

  const loadProbeFile = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.probe';
    input.onchange = event => {
      const file = event.target.files[0];
      if (!file) {
        return;
      }
      const reader = new FileReader();
      reader.onload = loadEvent => handleProbeFileLoaded(file.name, loadEvent.target.result);
      reader.readAsText(file);
    };
    input.click();
  }, [handleProbeFileLoaded]);

  const startTestProbe = useCallback(() => {
    const current = stateRef.current;
    if (!canClickForState(current)) {
      return;
    }
    closeModal();
    controller.command('autolevel:start', {
      mode: 'test',
      clearanceZ: current.clearanceZ,
      startZ: current.startZ,
      endZ: current.endZ,
      feedrate: current.feedrate,
    });
    log.info('Running test probe');
  }, [closeModal]);

  const startProbing = useCallback(() => {
    const current = stateRef.current;
    const validationErrors = getValidationErrors(current);
    if (current.probeState === PROBE_STATE_RUNNING || !canClickForState(current) || Object.keys(validationErrors).length) {
      return;
    }
    if (delayedVisualizationRef.current) {
      clearTimeout(delayedVisualizationRef.current);
      delayedVisualizationRef.current = null;
    }
    const totalPoints = getScanPointCount(current);
    transition({ type: 'START_PROBING', payload: { totalPoints } });
    pubsub.publish('autolevel:hideProbeVisualization');
    controller.command('autolevel:start', {
      mode: 'full',
      startX: current.startX,
      endX: current.endX,
      stepX: current.stepX,
      startY: current.startY,
      endY: current.endY,
      stepY: current.stepY,
      clearanceZ: current.clearanceZ,
      startZ: current.startZ,
      endZ: current.endZ,
      feedrate: current.feedrate,
      scanPattern: current.scanPattern,
      scanDirection: current.scanDirection,
    });
    log.info('Starting probe sequence');
  }, [transition]);

  const stopProbing = useCallback(() => {
    if (stateRef.current.probeState !== PROBE_STATE_RUNNING) {
      return;
    }
    transition({ type: 'STOP_PROBING' });
    controller.command('autolevel:stop');
    pubsub.publish('autolevel:hideProbeVisualization');
    log.info('Probing stopped by user');
  }, [transition]);

  const updateField = useCallback((field, event) => {
    const action = { type: 'SET_FIELD', payload: { field, value: parseInputValue(event.target.value) } };
    const nextState = autolevelReducer(stateRef.current, action);
    stateRef.current = nextState;
    dispatch(action);
    if (VISUALIZER_CONFIG_KEYS.has(field)) {
      publishProbeAreaForView(nextState);
    }
  }, [dispatch, publishProbeAreaForView]);

  const handleInputFocus = useCallback(event => {
    const { name } = event.target;
    if (name) {
      previousValidValuesRef.current[name] = stateRef.current[name];
    }
    event.target.select();
  }, []);

  const handleProbeAreaBlur = useCallback(event => {
    const current = stateRef.current;
    const { startX, startY, endX, endY, units } = current;
    const valid = [startX, startY, endX, endY].every(isValidNumber) && endX >= startX && endY >= startY;
    const inputName = event.target.name;
    if (!valid && inputName && previousValidValuesRef.current[inputName] !== undefined) {
      const action = {
        type: 'SET_FIELD',
        payload: { field: inputName, value: previousValidValuesRef.current[inputName] },
      };
      transition(action);
      publishProbeAreaForView(autolevelReducer(current, action));
      return;
    }
    if (valid && (current.wizardView === VIEW_SETUP_PROBE || current.wizardView === VIEW_PROBING)) {
      pubsub.publish('autolevel:updateProbeVisualization', {
        config: { startX, startY, endX, endY, units },
      });
    }
  }, [publishProbeAreaForView, transition]);

  const saveProbeData = useCallback(() => {
    const { probedPositions, probeFileName } = stateRef.current;
    const data = probedPositions.map(({ x, y, z }) => `${x} ${y} ${z} 0 0 0 0 0 0`).join('\n');
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = probeFileName || `probe_${Date.now()}.probe`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, []);

  const applyToGcode = useCallback((gcode, gcodeFileName, onSuccess, onError, onProgress) => {
    const { probedPositions } = stateRef.current;
    onProgress?.(PROCESSING_PHASE_COMPENSATING);
    controller.command('autolevel:applyProbeCompensation', {
      gcode,
      probeData: probedPositions,
    }, (error, result) => {
      if (error) {
        log.error('Error applying auto-level:', error);
        onError?.(String(error));
        return;
      }
      if (!result || !result.compensatedGcode) {
        onError?.('Invalid compensation result');
        return;
      }
      const meta = { name: `AL_${gcodeFileName}`, gcode: result.compensatedGcode };
      onProgress?.(PROCESSING_PHASE_LOADING);
      loadGCodeMutation.mutate({ meta, context: controller.context }, {
        onSuccess: response => {
          const { name = '', gcode: loadedGcode = '' } = response || {};
          pubsub.publish('gcode:load', {
            name,
            gcode: loadedGcode,
            isProbeCompensationApplied: true,
          });
          transition({ type: 'SET_GCODE_APPLIED', payload: true });
          onSuccess?.(result.compensatedGcode);
        },
        onError: loadError => {
          log.error('Failed to load compensated G-code to server:', loadError);
          onError?.('Failed to load compensated G-code to workspace');
        },
      });
    });
  }, [loadGCodeMutation, transition]);

  const exportLevelledGcode = useCallback((gcode, gcodeFileName) => {
    const { probedPositions } = stateRef.current;
    controller.command('autolevel:applyProbeCompensation', {
      gcode,
      probeData: probedPositions,
    }, (error, result) => {
      if (error || !result?.compensatedGcode) {
        return;
      }
      const url = URL.createObjectURL(new Blob([result.compensatedGcode], { type: 'text/plain' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `AL_${gcodeFileName}`;
      anchor.click();
      URL.revokeObjectURL(url);
    });
  }, []);

  const backToLanding = useCallback(() => {
    transition({ type: 'RESET' });
    pubsub.publish('autolevel:hideProbeVisualization');
  }, [transition]);

  const clearGcode = useCallback(() => {
    controller.command('gcode:unload');
    pubsub.publish('gcode:unload');
    transition({ type: 'SET_GCODE_APPLIED', payload: false });
  }, [transition]);

  const toggleFullscreen = useCallback(() => {
    onViewChange(view === 'fullscreen' ? 'normal' : 'fullscreen');
  }, [onViewChange, view]);

  const toggleCollapsed = useCallback(() => {
    onViewChange(view === 'collapsed' ? 'normal' : 'collapsed');
  }, [onViewChange, view]);

  const validationErrors = getValidationErrors(state);
  const canClick = canClickForState(state) && Object.keys(validationErrors).length === 0;
  const isCollapsed = view === 'collapsed';
  const isFullscreen = view === 'fullscreen';
  const isForkedWidget = /\w+:[\w-]+/.test(widgetId);

  return (
    <Box
      data-fullscreen={String(isFullscreen)}
      aria-label={i18n._('Autolevel Widget')}
      role="region"
      sx={{
        position: isFullscreen ? 'fixed' : 'relative',
        ...(isFullscreen && {
          top: '48px',
          right: 0,
          bottom: 0,
          left: '60px',
          margin: 0,
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'background.high',
          color: 'text.primary',
          '& [data-sortable-handle]': { display: 'none' },
        }),
      }}
    >
      <Box
        alignItems="center" display="flex"
        justifyContent="space-between"
        p="2x"
        sx={{
          backgroundColor: 'background.high',
          border: '1px solid',
          borderColor: 'border.secondary',
          color: 'text.primary',
          position: 'relative',
          flex: 'none',
        }}
      >
        <Box
          alignItems="center" display="flex"
          gap="2x"
          sx={{ fontWeight: 400, lineHeight: 1.5 }}
        >
          <Box className={sortable.handleClassName} data-sortable-handle sx={{ cursor: 'move', display: 'inline-block' }}>
            <Button aria-label={i18n._('Move Autolevel widget')} size="sm" variant="ghost">
              <MenuIcon />
            </Button>
          </Box>
          {isForkedWidget && <FontAwesomeIcon icon={faCodeBranch} fixedWidth />}
          <Box fontWeight="bold">{i18n._('Autolevel')}</Box>
        </Box>
        <Box
          alignItems="center" aria-label={i18n._('Widget controls')}
          display="flex"
          gap="1x" role="toolbar"
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
          }}
        >
          <Button
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? i18n._('Expand') : i18n._('Collapse')}
            disabled={isFullscreen}
            onClick={toggleCollapsed}
            title={isCollapsed ? i18n._('Expand') : i18n._('Collapse')}
            variant="ghost"
          >
            {isCollapsed ? <ChevronDownIcon /> : <ChevronUpIcon />}
          </Button>
          <Dropdown
            items={[
              {
                value: 'fullscreen',
                content: (
                  <>
                    <FontAwesomeIcon fixedWidth icon={isFullscreen ? faCompress : faExpand} />
                    <Space width="1x" />
                    {i18n._(isFullscreen ? 'Exit Full Screen' : 'Enter Full Screen')}
                  </>
                ),
                props: { onClick: toggleFullscreen },
              },
              {
                value: 'fork',
                content: (
                  <>
                    <FontAwesomeIcon fixedWidth icon={faCodeBranch} />
                    <Space width="1x" />
                    {i18n._('Fork Widget')}
                  </>
                ),
                props: { onClick: onFork },
              },
              {
                value: 'remove',
                content: (
                  <>
                    <CloseIcon />
                    <Space width="1x" />
                    {i18n._('Remove Widget')}
                  </>
                ),
                props: { onClick: onRemove },
              },
            ]}
            renderItem={item => item?.content}
            renderToggle={() => (
              <DropdownButton aria-label={i18n._('More')} title={i18n._('More')} variant="ghost">
                <MoreIcon />
              </DropdownButton>
            )}
          />
        </Box>
      </Box>
      <Box
        aria-hidden={isCollapsed}
        data-widget-content
        sx={{
          position: 'relative',
          flex: isFullscreen ? '1 1 0' : undefined,
          minHeight: isFullscreen ? 0 : undefined,
          overflow: isFullscreen ? 'auto' : undefined,
          display: isCollapsed ? 'none' : undefined,
          padding: '10px',
          border: '1px solid',
          borderColor: 'border.secondary',
          borderTop: 'none',
        }}
      >
        {state.modal.name === MODAL_START_PROBE_CONFIRM && (
          <StartProbeModal
            canConfirm={canClick} onCancel={closeModal} onConfirm={startProbing}
            value={state}
          />
        )}
        {state.modal.name === MODAL_STOP_PROBE_CONFIRM && (
          <StopProbeModal onCancel={closeModal} onConfirm={stopProbing} />
        )}
        {state.modal.name === MODAL_TEST_PROBE_CONFIRM && (
          <TestProbeModal
            canConfirm={canClick} onCancel={closeModal} onConfirm={startTestProbe}
            value={state}
          />
        )}
        {state.wizardView === VIEW_LANDING && (
          <LandingView onLoadProbeFile={loadProbeFile} onStartNewProbe={startNewProbe} />
        )}
        {(state.wizardView === VIEW_SETUP_PROBE || state.wizardView === VIEW_PROBING) && (
          <SetupProbeView
            canClick={canClick}
            onBack={backToLanding}
            onClearanceZChange={event => updateField('clearanceZ', event)}
            onEndXChange={event => updateField('endX', event)}
            onEndYChange={event => updateField('endY', event)}
            onEndZChange={event => updateField('endZ', event)}
            onInputFocus={handleInputFocus}
            onProbeAreaBlur={handleProbeAreaBlur}
            onProbeFeedrateChange={event => updateField('feedrate', event)}
            onScanDirectionChange={event => updateField('scanDirection', event)}
            onScanPatternChange={event => updateField('scanPattern', event)}
            onShowStartProbeConfirmation={() => openModal(MODAL_START_PROBE_CONFIRM)}
            onShowStopProbeConfirmation={() => openModal(MODAL_STOP_PROBE_CONFIRM)}
            onShowTestProbeConfirmation={() => openModal(MODAL_TEST_PROBE_CONFIRM)}
            onStartXChange={event => updateField('startX', event)}
            onStartYChange={event => updateField('startY', event)}
            onStartZChange={event => updateField('startZ', event)}
            onStepXChange={event => updateField('stepX', event)}
            onStepYChange={event => updateField('stepY', event)}
            validationErrors={validationErrors}
            value={state}
          />
        )}
        {state.wizardView === VIEW_APPLY && (
          <ApplyView
            onApply={applyToGcode}
            onBack={backToLanding}
            onClear={clearGcode}
            onExport={exportLevelledGcode}
            onSaveProbeData={saveProbeData}
            value={state}
          />
        )}
      </Box>
    </Box>
  );
}

export { autolevelReducer, createInitialState, getValidationErrors };
export default AutolevelWidget;
