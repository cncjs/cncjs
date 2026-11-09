import { Button, Dropdown, DropdownToggle, Space, Spinner } from '@tonic-ui/react';
import { ChevronDownIcon, ChevronUpIcon, MenuIcon, MoreIcon, RefreshIcon } from '@tonic-ui/react-icons';
import classNames from 'classnames';
import { ensureNumber, ensureString } from 'ensure-type';
import produce from 'immer';
import get from 'lodash/get';
import includes from 'lodash/includes';
import isEqual from 'lodash/isEqual';
import mapValues from 'lodash/mapValues';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Widget from '@app/components/Widget';
import widgetStyles from '@app/components/Widget/index.styl';
import {
  IMPERIAL_UNITS,
  METRIC_UNITS,
} from '@app/constants';
import {
  GRBL,
  MARLIN,
  SMOOTHIE,
  TINYG,
} from '@app/constants/controller';
import controller from '@app/lib/controller';
import i18n from '@app/lib/i18n';
import log from '@app/lib/log';
import { in2mm, mapPositionToUnits, mapValueToUnits } from '@app/lib/units';
import WidgetConfigProvider from '@app/widgets/shared/WidgetConfigProvider';
import Tool from './Tool';
import { TOOL_CHANGE_POLICY_IGNORE_M6_COMMANDS } from './constants';
import styles from './index.styl';
import { useSaveToolConfigMutation, useToolConfigQuery } from './queries';

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

export const createToolConfigDraft = (tool = {}, units = METRIC_UNITS) => ({
  toolChangePolicy: ensureNumber(get(tool, 'toolChangePolicy', TOOL_CHANGE_POLICY_IGNORE_M6_COMMANDS)),
  toolChangeX: mapPositionToUnits(ensureNumber(get(tool, 'toolChangeX', 0)), units),
  toolChangeY: mapPositionToUnits(ensureNumber(get(tool, 'toolChangeY', 0)), units),
  toolChangeZ: mapPositionToUnits(ensureNumber(get(tool, 'toolChangeZ', 0)), units),
  toolProbeX: mapPositionToUnits(ensureNumber(get(tool, 'toolProbeX', 0)), units),
  toolProbeY: mapPositionToUnits(ensureNumber(get(tool, 'toolProbeY', 0)), units),
  toolProbeZ: mapPositionToUnits(ensureNumber(get(tool, 'toolProbeZ', 0)), units),
  toolProbeCustomCommands: ensureString(get(tool, 'toolProbeCustomCommands')),
  toolProbeCommand: ensureString(get(tool, 'toolProbeCommand', 'G38.2')),
  toolProbeDistance: mapValueToUnits(ensureNumber(get(tool, 'toolProbeDistance', 1)), units),
  toolProbeFeedrate: mapValueToUnits(ensureNumber(get(tool, 'toolProbeFeedrate', 10)), units),
  touchPlateHeight: mapValueToUnits(ensureNumber(get(tool, 'touchPlateHeight', 0)), units),
});

const toMetricToolConfig = (draft, units) => {
  const toMetric = value => ensureNumber(units === IMPERIAL_UNITS ? in2mm(value) : value);
  return {
    toolChangePolicy: ensureNumber(draft.toolChangePolicy),
    toolChangeX: toMetric(draft.toolChangeX),
    toolChangeY: toMetric(draft.toolChangeY),
    toolChangeZ: toMetric(draft.toolChangeZ),
    toolProbeX: toMetric(draft.toolProbeX),
    toolProbeY: toMetric(draft.toolProbeY),
    toolProbeZ: toMetric(draft.toolProbeZ),
    toolProbeCustomCommands: ensureString(draft.toolProbeCustomCommands),
    toolProbeCommand: ensureString(draft.toolProbeCommand),
    toolProbeDistance: toMetric(draft.toolProbeDistance),
    toolProbeFeedrate: toMetric(draft.toolProbeFeedrate),
    touchPlateHeight: toMetric(draft.touchPlateHeight),
  };
};

const createRuntimeState = () => ({
  connected: !!controller.connection.ident,
  units: METRIC_UNITS,
  controller: { type: controller.type, state: controller.state },
  workflow: { state: controller.workflow.state },
  machinePosition: {},
  workPosition: {},
});

const createControllerReport = (runtime, controllerType, controllerState) => {
  let units = runtime.units;
  let machinePosition = runtime.machinePosition;
  let workPosition = runtime.workPosition;

  if (controllerType === GRBL) {
    const { status = {}, parserstate = {} } = controllerState || {};
    const { mpos = {}, wpos = {} } = status;
    const { modal = {} } = parserstate;
    const $13 = Number(get(controller.settings, 'settings.$13', 0)) || 0;
    units = { G20: IMPERIAL_UNITS, G21: METRIC_UNITS }[modal.units] || units;
    machinePosition = mapValues({ ...machinePosition, ...mpos }, value => ($13 > 0 ? in2mm(value) : value));
    workPosition = mapValues({ ...workPosition, ...wpos }, value => ($13 > 0 ? in2mm(value) : value));
  }
  if (controllerType === MARLIN) {
    const { pos = {}, modal = {} } = controllerState || {};
    units = { G20: IMPERIAL_UNITS, G21: METRIC_UNITS }[modal.units] || units;
    machinePosition = { ...machinePosition, ...pos };
    workPosition = { ...workPosition, ...pos };
  }
  if (controllerType === SMOOTHIE) {
    const { status = {}, parserstate = {} } = controllerState || {};
    const { mpos = {}, wpos = {} } = status;
    const { modal = {} } = parserstate;
    units = { G20: IMPERIAL_UNITS, G21: METRIC_UNITS }[modal.units] || units;
    machinePosition = mapValues({ ...machinePosition, ...mpos }, value => (units === IMPERIAL_UNITS ? in2mm(value) : value));
    workPosition = mapValues({ ...workPosition, ...wpos }, value => (units === IMPERIAL_UNITS ? in2mm(value) : value));
  }
  if (controllerType === TINYG) {
    const { sr = {} } = controllerState || {};
    const { mpos = {}, wpos = {}, modal = {} } = sr;
    units = { G20: IMPERIAL_UNITS, G21: METRIC_UNITS }[modal.units] || units;
    machinePosition = { ...machinePosition, ...mpos };
    workPosition = mapValues({ ...workPosition, ...wpos }, value => (units === IMPERIAL_UNITS ? in2mm(value) : value));
  }
  return {
    ...runtime,
    units,
    controller: { type: controllerType, state: controllerState },
    machinePosition,
    workPosition,
  };
};

/**
 * @param {{widgetId: string, onRemove?: Function, view: string, onViewChange: Function, sortable?: object}} props
 */
function ToolWidget({
  widgetId,
  onRemove = () => {},
  view,
  onViewChange,
  sortable = {},
}) {
  const [runtime, setRuntime] = useState(createRuntimeState);
  const [draft, setDraft] = useState(null);
  const [saveVersion, setSaveVersion] = useState(0);
  const runtimeRef = useRef(runtime);
  const draftRef = useRef(draft);
  const savedVersionRef = useRef(0);
  const query = useToolConfigQuery();
  const saveMutation = useSaveToolConfigMutation();
  const isCollapsed = view === 'collapsed';
  const isFullscreen = view === 'fullscreen';

  useEffect(() => {
    runtimeRef.current = runtime;
  }, [runtime]);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);
  useEffect(() => {
    if (query.data && !draftRef.current) {
      const nextDraft = createToolConfigDraft(query.data, runtimeRef.current.units);
      draftRef.current = nextDraft;
      setDraft(nextDraft);
    }
  }, [query.data]);

  useEffect(() => {
    const events = {
      'connection:open': () => {
        const nextRuntime = { ...runtimeRef.current, connected: true };
        runtimeRef.current = nextRuntime;
        setRuntime(nextRuntime);
      },
      'connection:change': (_connectionState, connected) => {
        const nextRuntime = connected
          ? { ...runtimeRef.current, connected: true }
          : { ...createRuntimeState(), connected: false };
        runtimeRef.current = nextRuntime;
        setRuntime(nextRuntime);
      },
      'workflow:state': workflowState => {
        const nextRuntime = { ...runtimeRef.current, workflow: { state: workflowState } };
        runtimeRef.current = nextRuntime;
        setRuntime(nextRuntime);
      },
      'controller:state': (controllerType, controllerState) => {
        const previous = runtimeRef.current;
        const nextRuntime = createControllerReport(previous, controllerType, controllerState);
        runtimeRef.current = nextRuntime;
        if (nextRuntime.units !== previous.units && draftRef.current) {
          const nextDraft = createToolConfigDraft(
            toMetricToolConfig(draftRef.current, previous.units),
            nextRuntime.units,
          );
          draftRef.current = nextDraft;
          setDraft(nextDraft);
        }
        setRuntime(nextRuntime);
      },
    };
    Object.entries(events).forEach(([name, listener]) => controller.addListener(name, listener));
    return () => Object.entries(events).forEach(([name, listener]) => controller.removeListener(name, listener));
  }, []);

  useEffect(() => {
    if (!draft || saveVersion === savedVersionRef.current) {
      return undefined;
    }
    const timer = setTimeout(() => {
      savedVersionRef.current = saveVersion;
      saveMutation.mutate(toMetricToolConfig(draft, runtime.units), {
        onError: error => log.error(error),
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [draft, runtime.units, saveMutation, saveVersion]);

  const onChange = useCallback(nextDraft => {
    if (isEqual(draftRef.current, nextDraft)) {
      return;
    }
    const updatedDraft = produce(draftRef.current, draft => Object.assign(draft, nextDraft));
    draftRef.current = updatedDraft;
    setDraft(updatedDraft);
    setSaveVersion(version => version + 1);
  }, []);

  const refresh = async () => {
    const result = await query.refetch();
    if (result.data) {
      const nextDraft = createToolConfigDraft(result.data, runtimeRef.current.units);
      draftRef.current = nextDraft;
      setDraft(nextDraft);
    }
  };
  const canClick = runtime.connected && includes([GRBL, MARLIN, SMOOTHIE, TINYG], runtime.controller.type);

  return (
    <WidgetConfigProvider widgetId={widgetId}>
      <Widget aria-label={i18n._('Tool widget')} fullscreen={isFullscreen}>
        <Widget.Header>
          <Widget.Title>
            <Widget.Sortable className={sortable.handleClassName}>
              <MenuIcon aria-hidden="true" size="1em" />
              <Space width="1x" />
            </Widget.Sortable>
            {i18n._('Tool')}
          </Widget.Title>
          <Widget.Controls className={sortable.filterClassName}>
            <Button variant="ghost" className={widgetStyles.widgetButton} sx={widgetActionSx} aria-label={i18n._('Refresh tool configuration')} title={i18n._('Refresh')} onClick={refresh}>
              {query.isFetching ? <Spinner size="xs" aria-hidden="true" /> : <RefreshIcon aria-hidden="true" size="1em" />}
            </Button>
            <Button
              variant="ghost"
              className={widgetStyles.widgetButton}
              sx={widgetActionSx}
              aria-label={i18n._(isCollapsed ? 'Expand' : 'Collapse')} aria-expanded={!isCollapsed} disabled={isFullscreen}
              title={i18n._(isCollapsed ? 'Expand' : 'Collapse')} onClick={() => onViewChange(isCollapsed ? 'normal' : 'collapsed')}
            >
              {isCollapsed ? <ChevronDownIcon aria-hidden="true" size="1em" /> : <ChevronUpIcon aria-hidden="true" size="1em" />}
            </Button>
            <Dropdown
              style={{ display: 'flex', alignSelf: 'stretch' }}
              items={[
                {
                  value: 'fullscreen',
                  label: isFullscreen ? i18n._('Exit Full Screen') : i18n._('Enter Full Screen'),
                },
                {
                  value: 'remove',
                  label: i18n._('Remove Widget'),
                },
              ]}
              onChange={({ value: key }) => {
                if (key === 'fullscreen') {
                  onViewChange(isFullscreen ? 'normal' : 'fullscreen');
                }
                if (key === 'remove') {
                  onRemove();
                }
              }}
              renderToggle={() => (
                <DropdownToggle aria-label={i18n._('More options')} title={i18n._('More')} className={widgetStyles.widgetButton}>
                  <MoreIcon aria-hidden="true" size="1em" />
                </DropdownToggle>
              )}
            />
          </Widget.Controls>
        </Widget.Header>
        <Widget.Content aria-hidden={isCollapsed} className={classNames(styles['widget-content'], { [styles.hidden]: isCollapsed })}>
          <Tool
            canClick={canClick} connected={runtime.connected} controller={runtime.controller}
            machinePosition={runtime.machinePosition} units={runtime.units} value={draft}
            onChange={onChange}
          />
        </Widget.Content>
      </Widget>
    </WidgetConfigProvider>
  );
}

export default ToolWidget;
