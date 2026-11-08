import { faCodeBranch, faCompress, faExpand, faKeyboard } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button, Dropdown, DropdownToggle, Space } from '@tonic-ui/react';
import { ChevronDownIcon, ChevronUpIcon, CloseIcon, MenuIcon, MoreIcon, SettingsIcon } from '@tonic-ui/react-icons';
import cx from 'classnames';
import { ensureArray } from 'ensure-type';
import get from 'lodash/get';
import includes from 'lodash/includes';
import map from 'lodash/map';
import mapValues from 'lodash/mapValues';
import React, { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import Widget from '@app/components/Widget';
import widgetStyles from '@app/components/Widget/index.styl';
import combokeys from '@app/lib/combokeys';
import controller from '@app/lib/controller';
import { preventDefault } from '@app/lib/dom-events';
import i18n from '@app/lib/i18n';
import { mapPositionToUnits } from '@app/lib/units';
import { limit } from '@app/lib/normalize-range';
import WidgetConfig from '@app/widgets/shared/WidgetConfig';
import WidgetConfigProvider from '@app/widgets/shared/WidgetConfigProvider';
import {
  IMPERIAL_UNITS,
  IMPERIAL_STEPS,
  METRIC_UNITS,
  METRIC_STEPS,
} from '@app/constants';
import {
  GRBL,
  GRBL_MACHINE_STATE_IDLE,
  GRBL_MACHINE_STATE_RUN,
  MARLIN,
  SMOOTHIE,
  SMOOTHIE_MACHINE_STATE_IDLE,
  SMOOTHIE_MACHINE_STATE_RUN,
  TINYG,
  TINYG_MACHINE_STATE_READY,
  TINYG_MACHINE_STATE_STOP,
  TINYG_MACHINE_STATE_END,
  TINYG_MACHINE_STATE_RUN,
} from '@app/constants/controller';
import { WORKFLOW_STATE_RUNNING } from '@app/constants/workflow';
import Axes from './Axes';
import { AxesProvider } from './context';
import KeypadOverlay from './KeypadOverlay';
import Settings from './Settings';
import ShuttleControl from './ShuttleControl';
import { MODAL_NONE, MODAL_SETTINGS, DEFAULT_AXES } from './constants';
import styles from './index.styl';
import { useMdiQuery } from './queries';
import { subscribeAxesEvents } from './subscriptions';
import {
  axesReducer,
  createAxesState,
  createControllerReportAction,
  getJogDistance,
  shouldHandleJogEvent,
} from './state';

const widgetActionSx = {
  alignSelf: 'stretch',
  border: 0,
  borderRadius: 0,
  minHeight: 'auto',
  backgroundColor: 'inherit',
  color: 'inherit',
  _hover: { backgroundColor: 'actions.hovered', color: 'inherit' },
  _disabled: { backgroundColor: 'inherit', color: 'text.disabled' },
};

const widgetSelectedActionSx = {
  backgroundColor: 'actions.selected',
  color: 'text.primary',
  _hover: { backgroundColor: 'actions.selectedHovered', color: 'text.primary' },
  _disabled: { backgroundColor: 'actions.selected', color: 'text.primary', opacity: 0.4 },
};

const noop = () => {};

/**
 * @param {object} state
 * @returns {boolean}
 */
const canClick = (state) => {
  const { connected, workflow, controller: controllerState } = state;
  const { type, state: machine } = controllerState;

  if (!connected || workflow.state === WORKFLOW_STATE_RUNNING) {
    return false;
  }
  if (!includes([GRBL, MARLIN, SMOOTHIE, TINYG], type)) {
    return false;
  }
  if (type === GRBL) {
    return includes(
      [GRBL_MACHINE_STATE_IDLE, GRBL_MACHINE_STATE_RUN],
      get(machine, 'status.machineState')
    );
  }
  if (type === SMOOTHIE) {
    return includes(
      [SMOOTHIE_MACHINE_STATE_IDLE, SMOOTHIE_MACHINE_STATE_RUN],
      get(machine, 'status.machineState')
    );
  }
  if (type === TINYG) {
    return includes(
      [TINYG_MACHINE_STATE_READY, TINYG_MACHINE_STATE_STOP, TINYG_MACHINE_STATE_END, TINYG_MACHINE_STATE_RUN],
      get(machine, 'machineState')
    );
  }

  return true;
};

/**
 * @param {object} jog
 * @param {string} units
 * @param {number} direction
 * @param {boolean} wrap
 * @returns {object}
 */
const changeJogStep = (jog, units, direction, wrap) => {
  const imperialSteps = [...jog.imperial.distances, ...IMPERIAL_STEPS];
  const metricSteps = [...jog.metric.distances, ...METRIC_STEPS];
  const change = (step, steps) => (wrap
    ? (step + direction + steps.length) % steps.length
    : limit(step + direction, 0, steps.length - 1));

  return {
    ...jog,
    imperial: {
      ...jog.imperial,
      step: units === IMPERIAL_UNITS ? change(jog.imperial.step, imperialSteps) : jog.imperial.step,
    },
    metric: {
      ...jog.metric,
      step: units === METRIC_UNITS ? change(jog.metric.step, metricSteps) : jog.metric.step,
    },
  };
};

/**
 * @param {{
 *   widgetId: string,
 *   view?: string,
 *   onViewChange?: (view: string) => void,
 *   sortable?: { handleClassName?: string, filterClassName?: string },
 *   onFork?: () => void,
 *   onRemove?: () => void,
 *   mdiCommands?: object[],
 *   onMdiConfigChange?: () => void,
 * }} props
 * @returns {JSX.Element}
 */
export function AxesWidgetContent({
  widgetId,
  view = 'normal',
  onViewChange = noop,
  sortable = {},
  onFork = noop,
  onRemove = noop,
  mdiCommands = [],
  onMdiConfigChange = noop,
}) {
  const configRef = useRef(null);
  if (!configRef.current) {
    configRef.current = new WidgetConfig(widgetId);
  }
  const config = configRef.current;
  const [state, dispatch] = useReducer(axesReducer, undefined, () => createAxesState(config, controller));
  const stateRef = useRef(state);
  const shuttleControlRef = useRef(null);
  const didMountRef = useRef(false);
  stateRef.current = state;

  const onSetPositionInput = useCallback((positionInput = null) => {
    dispatch({ type: 'SET_POSITION_INPUT', payload: positionInput });
  }, []);
  const onOpenModal = useCallback((name = MODAL_NONE, params = {}) => {
    dispatch({ type: 'SET_MODAL', payload: { name, params } });
  }, []);
  const onCloseModal = useCallback(() => {
    dispatch({ type: 'SET_MODAL', payload: { name: MODAL_NONE, params: {} } });
  }, []);
  const onGetJogDistance = useCallback(() => {
    const current = stateRef.current;
    return getJogDistance(current.jog, current.units);
  }, []);
  const onGetWorkCoordinateSystem = useCallback(() => {
    const { type, state: controllerState } = stateRef.current.controller;
    const defaultWCS = 'G54';

    if (type === GRBL || type === SMOOTHIE) {
      return get(controllerState, 'parserstate.modal.wcs') || defaultWCS;
    }
    if (type === MARLIN || type === TINYG) {
      return get(controllerState, 'modal.wcs') || defaultWCS;
    }
    return defaultWCS;
  }, []);
  const onJog = useCallback((params = {}) => {
    const axes = map(params, (value, letter) => `${letter.toUpperCase()}${value}`).join(' ');
    controller.command('gcode', 'G91');
    controller.command('gcode', `G0 ${axes}`);
    controller.command('gcode', 'G90');
  }, []);
  const onMove = useCallback((params = {}) => {
    const axes = map(params, (value, letter) => `${letter.toUpperCase()}${value}`).join(' ');
    controller.command('gcode', `G0 ${axes}`);
  }, []);
  const onSetWorkOffsets = useCallback((axis, value) => {
    const controllerType = stateRef.current.controller.type;
    const letter = (axis || '').toUpperCase();
    const offset = Number(value) || 0;

    if (controllerType === MARLIN) {
      controller.command('gcode', `G92 ${letter}${offset}`);
      return;
    }

    const p = { G54: 1, G55: 2, G56: 3, G57: 4, G58: 5, G59: 6 }[onGetWorkCoordinateSystem()] || 0;
    controller.command('gcode', `G10 L20 P${p} ${letter}${offset}`);
  }, [onGetWorkCoordinateSystem]);
  const onToggleMDIMode = useCallback(() => {
    dispatch({ type: 'SET_MDI', payload: { disabled: !stateRef.current.mdi.disabled } });
  }, []);
  const onToggleKeypadJogging = useCallback(() => {
    dispatch({ type: 'SET_JOG', payload: { keypad: !stateRef.current.jog.keypad } });
  }, []);
  const onSelectAxis = useCallback((axis = '') => {
    dispatch({ type: 'SET_JOG', payload: { axis } });
  }, []);
  const onSelectStep = useCallback((value = '') => {
    const current = stateRef.current;
    const step = Number(value);
    dispatch({
      type: 'SET_JOG',
      payload: current.units === IMPERIAL_UNITS
        ? { imperial: { ...current.jog.imperial, step } }
        : { metric: { ...current.jog.metric, step } },
    });
  }, []);
  const onStepBackward = useCallback(() => {
    const current = stateRef.current;
    dispatch({ type: 'SET_JOG', payload: changeJogStep(current.jog, current.units, -1, false) });
  }, []);
  const onStepForward = useCallback(() => {
    const current = stateRef.current;
    dispatch({ type: 'SET_JOG', payload: changeJogStep(current.jog, current.units, 1, false) });
  }, []);
  const onStepNext = useCallback(() => {
    const current = stateRef.current;
    dispatch({ type: 'SET_JOG', payload: changeJogStep(current.jog, current.units, 1, true) });
  }, []);
  const onJogEvent = useCallback((event, { axis = null, direction = 1, factor = 1 }) => {
    const current = stateRef.current;
    if (!canClick(current) || !shouldHandleJogEvent(event, current.modal.name !== MODAL_NONE)) {
      return;
    }
    if (axis !== null && !current.jog.keypad) {
      return;
    }

    preventDefault(event);
    const distance = onGetJogDistance();
    const jogAxis = {
      x: () => onJog({ X: direction * distance * factor }),
      y: () => onJog({ Y: direction * distance * factor }),
      z: () => onJog({ Z: direction * distance * factor }),
      a: () => onJog({ A: direction * distance * factor }),
      b: () => onJog({ B: direction * distance * factor }),
      c: () => onJog({ C: direction * distance * factor }),
    }[axis || current.jog.axis];
    jogAxis?.();
  }, [onGetJogDistance, onJog]);
  const onShuttleEvent = useCallback((event, { zone = 0 }) => {
    const current = stateRef.current;
    if (!canClick(current)) {
      return;
    }
    if (zone === 0) {
      shuttleControlRef.current?.clear();
      if (current.jog.axis) {
        controller.command('gcode', 'G90');
      }
      return;
    }
    if (!current.jog.axis) {
      return;
    }

    shuttleControlRef.current?.accumulate(zone, {
      axis: current.jog.axis,
      distance: Math.min(onGetJogDistance(), 1),
      feedrateMin: config.get('shuttle.feedrateMin'),
      feedrateMax: config.get('shuttle.feedrateMax'),
      hertz: config.get('shuttle.hertz'),
      overshoot: config.get('shuttle.overshoot'),
    });
  }, [config, onGetJogDistance]);
  const onConnectionChange = useCallback((connectionState, connected) => {
    if (connected) {
      dispatch({ type: 'SET_STATE', payload: { connected } });
      return;
    }
    shuttleControlRef.current?.clear();
    dispatch({ type: 'RESET_CONNECTION', payload: createAxesState(config, controller) });
  }, [config]);
  const onWorkflowState = useCallback((workflowState) => {
    const current = stateRef.current;
    const canJog = workflowState !== WORKFLOW_STATE_RUNNING;
    dispatch({
      type: 'SET_STATE',
      payload: {
        jog: { ...current.jog, axis: canJog ? current.jog.axis : '', keypad: canJog ? current.jog.keypad : false },
        workflow: { ...current.workflow, state: workflowState },
      },
    });
  }, []);
  const onControllerSettings = useCallback((type, settings) => {
    dispatch({
      type: 'SET_STATE',
      payload: { controller: { ...stateRef.current.controller, type, settings } },
    });
  }, []);
  const onControllerState = useCallback((type, controllerState) => {
    const action = createControllerReportAction(stateRef.current, type, controllerState, controller.settings);
    if (action) {
      dispatch(action);
    }
  }, []);
  const onShuttleFlush = useCallback(({ axis, feedrate, relativeDistance }) => {
    const normalizedFeedrate = feedrate.toFixed(3) * 1;
    const normalizedDistance = relativeDistance.toFixed(4) * 1;
    controller.command('gcode', 'G91');
    controller.command('gcode', `G1 F${normalizedFeedrate} ${axis}${normalizedDistance}`);
    controller.command('gcode', 'G90');
  }, []);

  const controllerEvents = useMemo(() => ({
    'config:change': onMdiConfigChange,
    'connection:open': () => dispatch({ type: 'SET_STATE', payload: { connected: true } }),
    'connection:change': onConnectionChange,
    'workflow:state': onWorkflowState,
    'controller:settings': onControllerSettings,
    'controller:state': onControllerState,
  }), [onConnectionChange, onControllerSettings, onControllerState, onMdiConfigChange, onWorkflowState]);
  const shuttleControlEvents = useMemo(() => ({
    SELECT_AXIS: (event, { axis }) => {
      const current = stateRef.current;
      if (canClick(current)) {
        onSelectAxis(current.jog.axis === axis ? '' : axis);
      }
    },
    JOG: onJogEvent,
    JOG_LEVER_SWITCH: (event, { key = '' }) => {
      if (key === '-') {
        onStepBackward();
      } else if (key === '+') {
        onStepForward();
      } else {
        onStepNext();
      }
    },
    SHUTTLE: onShuttleEvent,
  }), [onJogEvent, onSelectAxis, onShuttleEvent, onStepBackward, onStepForward, onStepNext]);

  useEffect(() => {
    const shuttleControl = new ShuttleControl();
    shuttleControlRef.current = shuttleControl;
    shuttleControl.on('flush', onShuttleFlush);
    const unsubscribe = subscribeAxesEvents({
      controller,
      combokeys,
      controllerEvents,
      shuttleControlEvents,
      shuttleControl,
    });

    return () => {
      unsubscribe();
      if (shuttleControlRef.current === shuttleControl) {
        shuttleControlRef.current = null;
      }
    };
  }, [controllerEvents, onShuttleFlush, shuttleControlEvents]);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    config.set('axes', state.axes);
    config.set('jog.keypad', state.jog.keypad);
    if (state.units === IMPERIAL_UNITS) {
      config.set('jog.imperial.step', Number(state.jog.imperial.step) || 0);
    }
    if (state.units === METRIC_UNITS) {
      config.set('jog.metric.step', Number(state.jog.metric.step) || 0);
    }
    config.set('mdi.disabled', state.mdi.disabled);
  }, [config, state.axes, state.jog, state.mdi.disabled, state.units]);

  const isCollapsed = view === 'collapsed';
  const isFullscreen = view === 'fullscreen';
  const isForkedWidget = widgetId.match(/\w+:[\w\-]+/);
  const displayState = {
    ...state,
    mdi: { ...state.mdi, commands: mdiCommands },
    canClick: canClick(state),
    machinePosition: mapValues(state.machinePosition, (position) => String(mapPositionToUnits(position, state.units))),
    workPosition: mapValues(state.workPosition, (position) => String(mapPositionToUnits(position, state.units))),
  };

  const onSettingsSave = useCallback(() => {
    const current = stateRef.current;
    dispatch({
      type: 'SET_STATE',
      payload: {
        axes: config.get('axes', DEFAULT_AXES),
        jog: {
          ...current.jog,
          imperial: { ...current.jog.imperial, distances: ensureArray(config.get('jog.imperial.distances', [])) },
          metric: { ...current.jog.metric, distances: ensureArray(config.get('jog.metric.distances', [])) },
        },
      },
    });
    onCloseModal();
  }, [config, onCloseModal]);
  const onMoreOptionsSelect = useCallback((eventKey) => {
    if (eventKey === 'settings') {
      onOpenModal(MODAL_SETTINGS);
    } else if (eventKey === 'fullscreen') {
      onViewChange(isFullscreen ? 'normal' : 'fullscreen');
    } else if (eventKey === 'fork') {
      onFork();
    } else if (eventKey === 'remove') {
      onRemove();
    }
  }, [isFullscreen, onFork, onOpenModal, onRemove, onViewChange]);

  return (
    <WidgetConfigProvider widgetId={widgetId}>
      <Widget aria-label="Axes widget" fullscreen={isFullscreen}>
        <Widget.Header>
          <Widget.Title>
            <Widget.Sortable className={sortable.handleClassName}>
              <MenuIcon aria-hidden="true" size="1em" width="1.25em" />
              <Space width="1x" />
            </Widget.Sortable>
            {isForkedWidget && <FontAwesomeIcon icon={faCodeBranch} fixedWidth aria-hidden="true" />}
            {i18n._('Axes')}
          </Widget.Title>
          <Widget.Controls className={sortable.filterClassName}>
            <KeypadOverlay show={displayState.canClick && displayState.jog.keypad}>
              <Button
                variant="ghost" className={widgetStyles.widgetButton} sx={{ ...widgetActionSx, ...(displayState.jog.keypad && widgetSelectedActionSx) }}
                aria-label="Toggle keypad jogging" title={i18n._('Keypad jogging')} onClick={onToggleKeypadJogging}
                aria-pressed={displayState.jog.keypad} disabled={!displayState.canClick}
              >
                <FontAwesomeIcon icon={faKeyboard} fixedWidth aria-hidden="true" />
              </Button>
            </KeypadOverlay>
            <Button
              variant="ghost" className={widgetStyles.widgetButton} sx={{ ...widgetActionSx, ...(!displayState.mdi.disabled && widgetSelectedActionSx) }}
              aria-label="Toggle manual data input mode" title={i18n._('Manual Data Input')} onClick={onToggleMDIMode}
              aria-pressed={!displayState.mdi.disabled}
            >
              <Space width="2x" />{i18n._('MDI')}<Space width="2x" />
            </Button>
            <Button
              variant="ghost"
              className={widgetStyles.widgetButton}
              sx={widgetActionSx}
              aria-label={isCollapsed ? 'Expand' : 'Collapse'} aria-expanded={!isCollapsed} disabled={isFullscreen}
              title={isCollapsed ? i18n._('Expand') : i18n._('Collapse')} onClick={() => onViewChange(isCollapsed ? 'normal' : 'collapsed')}
            >
              {isCollapsed && <ChevronDownIcon aria-hidden="true" size="1em" width="1.25em" />}
              {!isCollapsed && <ChevronUpIcon aria-hidden="true" size="1em" width="1.25em" />}
            </Button>
            {isFullscreen && <Button variant="ghost" className={widgetStyles.widgetButton} sx={widgetActionSx} title={i18n._('Exit Full Screen')} onClick={() => onViewChange('normal')}><FontAwesomeIcon icon={faCompress} fixedWidth aria-hidden="true" /></Button>}
            <Dropdown
              style={{ display: 'flex', alignSelf: 'stretch' }}
              items={[
                {
                  value: 'settings',
                  label: (<><SettingsIcon aria-hidden="true" size="1em" width="1.25em" /><Space width="2x" />{i18n._('Settings')}</>),
                },
                {
                  value: 'fullscreen',
                  label: (<><FontAwesomeIcon icon={isFullscreen ? faCompress : faExpand} fixedWidth aria-hidden="true" /><Space width="2x" />{isFullscreen ? i18n._('Exit Full Screen') : i18n._('Enter Full Screen')}</>),
                },
                {
                  value: 'fork',
                  label: (<><FontAwesomeIcon icon={faCodeBranch} fixedWidth aria-hidden="true" /><Space width="2x" />{i18n._('Fork Widget')}</>),
                },
                {
                  value: 'remove',
                  label: (<><CloseIcon aria-hidden="true" size="1em" width="1.25em" /><Space width="2x" />{i18n._('Remove Widget')}</>),
                },
              ]}
              onChange={(item) => onMoreOptionsSelect(item.value)}
              renderToggle={() => (
                <DropdownToggle aria-label="More options" title={i18n._('More')} className={widgetStyles.widgetButton}>
                  <MoreIcon aria-hidden="true" size="1em" width="1.25em" />
                </DropdownToggle>
              )}
            />
          </Widget.Controls>
        </Widget.Header>
        <Widget.Content aria-hidden={isCollapsed} className={cx(styles['widget-content'], { [styles.hidden]: isCollapsed })}>
          {displayState.modal.name === MODAL_SETTINGS && <Settings config={config} onSave={onSettingsSave} onCancel={onCloseModal} />}
          <AxesProvider value={{
            state: displayState,
            onGetJogDistance,
            onGetWorkCoordinateSystem,
            onJog,
            onMove,
            onSelectStep,
            onSetPositionInput,
            onSetWorkOffsets,
            onStepBackward,
            onStepForward,
          }}
          >
            <Axes />
          </AxesProvider>
        </Widget.Content>
      </Widget>
    </WidgetConfigProvider>
  );
}

/**
 * Uses the shared MDI query cache. Controller config changes request a refetch
 * instead of creating a second fetch/loading state in the widget.
 * @param {object} props
 * @returns {JSX.Element}
 */
function AxesWidget(props) {
  const { data, refetch } = useMdiQuery();
  const mdiCommands = Array.isArray(data?.records) ? data.records : [];
  const onMdiConfigChange = useCallback(() => refetch(), [refetch]);

  return <AxesWidgetContent {...props} mdiCommands={mdiCommands} onMdiConfigChange={onMdiConfigChange} />;
}

export default AxesWidget;
