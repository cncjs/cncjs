import { ensureArray } from 'ensure-type';
import mapValues from 'lodash/mapValues';
import {
  IMPERIAL_UNITS,
  IMPERIAL_STEPS,
  METRIC_UNITS,
  METRIC_STEPS,
} from '@app/constants';
import { GRBL, MARLIN, SMOOTHIE, TINYG } from '@app/constants/controller';
import { in2mm } from '@app/lib/units';
import { DEFAULT_AXES, MODAL_NONE } from './constants';

const initialPosition = {
  x: '0.000', y: '0.000', z: '0.000', a: '0.000', b: '0.000', c: '0.000'
};

/**
 * Prevent global jogging while an editable control or modal owns the keyboard.
 * @param {{ type?: string, target?: EventTarget | null }} event
 * @param {boolean} hasOpenModal
 * @returns {boolean}
 */
export const shouldHandleJogEvent = (event, hasOpenModal) => {
  if (hasOpenModal || event?.type !== 'keydown') {
    return false;
  }

  const target = /** @type {HTMLElement | null} */ (event.target);
  return !target?.closest('input, textarea, select, button, [contenteditable="true"], [role="dialog"]');
};

/**
 * @param {{ get: (key: string, fallback?: unknown) => unknown }} config
 * @param {object} controller
 * @returns {object}
 */
export const createAxesState = (config, controller = {}) => ({
  connected: !!controller.connection?.ident,
  units: METRIC_UNITS,
  controller: { type: controller.type, settings: controller.settings, state: controller.state },
  workflow: { state: controller.workflow?.state },
  modal: { name: MODAL_NONE, params: {} },
  axes: config.get('axes', DEFAULT_AXES),
  machinePosition: { ...initialPosition },
  workPosition: { ...initialPosition },
  positionInput: null,
  jog: {
    axis: '',
    keypad: config.get('jog.keypad'),
    imperial: { step: config.get('jog.imperial.step'), distances: ensureArray(config.get('jog.imperial.distances', [])) },
    metric: { step: config.get('jog.metric.step'), distances: ensureArray(config.get('jog.metric.distances', [])) }
  },
  mdi: { disabled: config.get('mdi.disabled'), commands: [] }
});

/**
 * Keeps controller reports and an in-progress user draft in separate state fields.
 * @param {object} state
 * @param {{ type: string, payload?: object }} action
 * @returns {object}
 */
export const axesReducer = (state, action) => {
  switch (action.type) {
  case 'REPORT_POSITION':
    return {
      ...state,
      ...action.payload,
      machinePosition: { ...state.machinePosition, ...action.payload.machinePosition },
      workPosition: { ...state.workPosition, ...action.payload.workPosition },
    };
  case 'SET_POSITION_INPUT':
    return { ...state, positionInput: action.payload };
  case 'SET_STATE':
    return { ...state, ...action.payload };
  case 'SET_JOG':
    return { ...state, jog: { ...state.jog, ...action.payload } };
  case 'SET_MDI':
    return { ...state, mdi: { ...state.mdi, ...action.payload } };
  case 'SET_MODAL':
    return { ...state, modal: action.payload };
  case 'RESET_CONNECTION':
    return {
      ...action.payload,
      mdi: { ...action.payload.mdi, commands: state.mdi.commands },
    };
  default:
    return state;
  }
};

/**
 * Converts a controller state event into a reducer action without observing or
 * replacing the editable position draft.
 * @param {object} state
 * @param {string} type
 * @param {object} controllerState
 * @param {object} controllerSettings
 * @returns {{ type: 'REPORT_POSITION', payload: object }|null}
 */
export const createControllerReportAction = (state, type, controllerState, controllerSettings) => {
  const payload = {
    controller: {
      ...state.controller,
      type,
      state: controllerState,
    },
  };

  if (type === GRBL) {
    const { status = {}, parserstate = {} } = controllerState;
    const { mpos = {}, wpos = {} } = status;
    const { modal = {} } = parserstate;
    const units = { G20: IMPERIAL_UNITS, G21: METRIC_UNITS }[modal.units] || state.units;
    const reportInInches = Number(controllerSettings?.settings?.$13) > 0;

    return {
      type: 'REPORT_POSITION',
      payload: {
        ...payload,
        units,
        machinePosition: mapValues({ ...state.machinePosition, ...mpos }, value => (reportInInches ? in2mm(value) : value)),
        workPosition: mapValues({ ...state.workPosition, ...wpos }, value => (reportInInches ? in2mm(value) : value)),
      },
    };
  }

  if (type === MARLIN) {
    const { pos = {}, modal = {} } = controllerState;
    const units = { G20: IMPERIAL_UNITS, G21: METRIC_UNITS }[modal.units] || state.units;
    return {
      type: 'REPORT_POSITION',
      payload: {
        ...payload,
        units,
        machinePosition: { ...state.machinePosition, ...pos },
        workPosition: { ...state.workPosition, ...pos },
      },
    };
  }

  if (type === SMOOTHIE) {
    const { status = {}, parserstate = {} } = controllerState;
    const { mpos = {}, wpos = {} } = status;
    const { modal = {} } = parserstate;
    const units = { G20: IMPERIAL_UNITS, G21: METRIC_UNITS }[modal.units] || state.units;
    return {
      type: 'REPORT_POSITION',
      payload: {
        ...payload,
        units,
        machinePosition: mapValues({ ...state.machinePosition, ...mpos }, value => (units === IMPERIAL_UNITS ? in2mm(value) : value)),
        workPosition: mapValues({ ...state.workPosition, ...wpos }, value => (units === IMPERIAL_UNITS ? in2mm(value) : value)),
      },
    };
  }

  if (type === TINYG) {
    const { sr = {} } = controllerState;
    const { mpos = {}, wpos = {}, modal = {} } = sr;
    const units = { G20: IMPERIAL_UNITS, G21: METRIC_UNITS }[modal.units] || state.units;
    return {
      type: 'REPORT_POSITION',
      payload: {
        ...payload,
        units,
        machinePosition: { ...state.machinePosition, ...mpos },
        workPosition: mapValues({ ...state.workPosition, ...wpos }, value => (units === IMPERIAL_UNITS ? in2mm(value) : value)),
      },
    };
  }

  return null;
};

/**
 * @param {{ imperial?: { step?: number, distances?: unknown[] }, metric?: { step?: number, distances?: unknown[] } }} jog
 * @param {string} units
 * @returns {number}
 */
export const getJogDistance = (jog, units) => {
  const settings = units === IMPERIAL_UNITS ? jog.imperial : jog.metric;
  const builtInSteps = units === IMPERIAL_UNITS ? IMPERIAL_STEPS : METRIC_STEPS;
  const distances = ensureArray(settings?.distances);
  return Number([...distances, ...builtInSteps][settings?.step]) || 0;
};

export { IMPERIAL_UNITS, METRIC_UNITS };
