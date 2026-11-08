import { faCodeBranch, faCompress, faExpand } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Box, Button, Dropdown, DropdownToggle, Space } from '@tonic-ui/react';
import { AppIcon, ChevronDownIcon, ChevronUpIcon, CloseIcon, InfoIcon, MenuIcon, MoreIcon } from '@tonic-ui/react-icons';
import { ensurePositiveNumber } from 'ensure-type';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Widget from '@app/components/Widget';
import widgetStyles from '@app/components/Widget/index.styl';
import { MARLIN } from '@app/constants/controller';
import controller from '@app/lib/controller';
import i18n from '@app/lib/i18n';
import WidgetConfig from '@app/widgets/shared/WidgetConfig';
import WidgetConfigProvider from '@app/widgets/shared/WidgetConfigProvider';
import Controller from './Controller';
import Marlin from './Marlin';

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

/**
 * @param {{
 *   onFork: () => void,
 *   onRemove: () => void,
 *   onViewChange: (view: 'normal' | 'collapsed' | 'fullscreen') => void,
 *   sortable: { filterClassName: string, handleClassName: string },
 *   view: 'normal' | 'collapsed' | 'fullscreen',
 *   widgetId: string,
 * }} props
 */
function MarlinWidget({ onFork, onRemove, onViewChange, sortable, view, widgetId }) {
  const config = useMemo(() => new WidgetConfig(widgetId), [widgetId]);
  const [state, setState] = useState(() => getInitialState(config));
  const [isControllerModalOpen, setIsControllerModalOpen] = useState(false);

  useEffect(() => {
    const onConnectionOpen = () => setState(current => ({ ...current, connected: true }));
    const onConnectionChange = (connectionState, connected) => {
      if (!connected) {
        setState({ ...getInitialState(config), connected: false });
        setIsControllerModalOpen(false);
        return;
      }
      setState(current => ({ ...current, connected: true }));
    };
    const onControllerSettings = (type, controllerSettings) => {
      if (type !== MARLIN) {
        return;
      }
      setState(current => ({
        ...current,
        controller: {
          ...current.controller,
          settings: { ...current.controller.settings, ...controllerSettings },
          type,
        },
      }));
    };
    const onControllerState = (type, controllerState) => {
      if (type !== MARLIN) {
        return;
      }
      setState(current => ({
        ...current,
        controller: {
          ...current.controller,
          state: { ...current.controller.state, ...controllerState },
          type,
        },
      }));
    };
    const listeners = {
      'connection:change': onConnectionChange,
      'connection:open': onConnectionOpen,
      'controller:settings': onControllerSettings,
      'controller:state': onControllerState,
    };

    Object.entries(listeners).forEach(([eventName, listener]) => {
      controller.addListener(eventName, listener);
    });
    return () => {
      Object.entries(listeners).forEach(([eventName, listener]) => {
        controller.removeListener(eventName, listener);
      });
    };
  }, [config]);

  const setPanelExpanded = useCallback((panelName, isExpanded) => {
    setState(current => ({
      ...current,
      panel: {
        ...current.panel,
        [panelName]: { ...current.panel[panelName], expanded: isExpanded },
      },
    }));
    config.set(`panel.${panelName}.expanded`, isExpanded);
  }, [config]);

  const changeHeaterTemperature = useCallback((heaterName, event) => {
    const inputValue = event.target.value;
    const value = typeof inputValue === 'string' && inputValue.trim() === ''
      ? inputValue
      : ensurePositiveNumber(inputValue);

    setState(current => ({
      ...current,
      heater: { ...current.heater, [heaterName]: value },
    }));
    if (Number.isFinite(value)) {
      config.set(`heater.${heaterName}`, value);
    }
  }, [config]);

  const isCollapsed = view === 'collapsed';
  const isFullscreen = view === 'fullscreen';
  const isReady = state.connected && state.controller.type === MARLIN;
  const isForkedWidget = widgetId.match(/\w+:[\w\-]+/);
  const actions = {
    changeExtruderTemperature: event => changeHeaterTemperature('extruder', event),
    changeHeatedBedTemperature: event => changeHeaterTemperature('heatedBed', event),
    setPanelExpanded,
  };

  return (
    <WidgetConfigProvider widgetId={widgetId}>
      <Widget aria-label="Marlin widget" fullscreen={isFullscreen}>
        <Widget.Header>
          <Widget.Title>
            <Widget.Sortable className={sortable.handleClassName}>
              <MenuIcon aria-hidden="true" size="1em" width="1.25em" />
              <Space width="1x" />
            </Widget.Sortable>
            {isForkedWidget && <FontAwesomeIcon icon={faCodeBranch} fixedWidth aria-hidden="true" />}
            Marlin
          </Widget.Title>
          <Widget.Controls className={sortable.filterClassName}>
            {isReady && (
              <Button variant="ghost" className={widgetStyles.widgetButton} sx={widgetActionSx} aria-label="Marlin controller info" onClick={() => setIsControllerModalOpen(true)}>
                <InfoIcon aria-hidden="true" size="1em" />
              </Button>
            )}
            {isReady && (
              <Dropdown
                style={{ display: 'flex', alignSelf: 'stretch' }}
                items={[
                  {
                    label: i18n._('Get Extruder Temperature (M105)'),
                    action: () => controller.writeln('M105'),
                  },
                  {
                    label: i18n._('Get Current Position (M114)'),
                    action: () => controller.writeln('M114'),
                  },
                  {
                    label: i18n._('Get Firmware Version and Capabilities (M115)'),
                    action: () => controller.writeln('M115'),
                  },
                ]}
                onChange={(item) => item.action?.()}
                renderToggle={() => (
                  <DropdownToggle aria-label="Marlin commands" className={widgetStyles.widgetButton}>
                    <AppIcon aria-hidden="true" size="1em" />
                  </DropdownToggle>
                )}
              />
            )}
            {isReady && (
              <Button
                variant="ghost"
                className={widgetStyles.widgetButton}
                sx={widgetActionSx}
                aria-label={isCollapsed ? 'Expand' : 'Collapse'}
                aria-expanded={!isCollapsed}
                disabled={isFullscreen}
                title={isCollapsed ? i18n._('Expand') : i18n._('Collapse')}
                onClick={() => onViewChange(isCollapsed ? 'normal' : 'collapsed')}
              >
                {isCollapsed ? <ChevronDownIcon aria-hidden="true" size="1em" width="1.25em" /> : <ChevronUpIcon aria-hidden="true" size="1em" width="1.25em" />}
              </Button>
            )}
            {isFullscreen && (
              <Button variant="ghost" className={widgetStyles.widgetButton} sx={widgetActionSx} title={i18n._('Exit Full Screen')} onClick={() => onViewChange('normal')}>
                <FontAwesomeIcon icon={faCompress} fixedWidth aria-hidden="true" />
              </Button>
            )}
            <Dropdown
              style={{ display: 'flex', alignSelf: 'stretch' }}
              items={[
                {
                  value: 'fullscreen',
                  label: (
                    <>
                      <FontAwesomeIcon icon={isFullscreen ? faCompress : faExpand} fixedWidth aria-hidden="true" />
                      <Space width="2x" />
                      {isFullscreen ? i18n._('Exit Full Screen') : i18n._('Enter Full Screen')}
                    </>
                  ),
                  props: { disabled: !isReady },
                },
                {
                  value: 'fork',
                  label: (
                    <>
                      <FontAwesomeIcon icon={faCodeBranch} fixedWidth aria-hidden="true" />
                      <Space width="2x" />
                      {i18n._('Fork Widget')}
                    </>
                  ),
                },
                {
                  value: 'remove',
                  label: (
                    <>
                      <CloseIcon aria-hidden="true" size="1em" width="1.25em" />
                      <Space width="2x" />
                      {i18n._('Remove Widget')}
                    </>
                  ),
                },
              ]}
              onChange={({ value: eventKey }) => {
                if (eventKey === 'fullscreen') {
                  onViewChange(isFullscreen ? 'normal' : 'fullscreen');
                } else if (eventKey === 'fork') {
                  onFork();
                } else if (eventKey === 'remove') {
                  onRemove();
                }
              }}
              renderToggle={() => (
                <DropdownToggle aria-label="More options" title={i18n._('More')} className={widgetStyles.widgetButton}>
                  <MoreIcon aria-hidden="true" size="1em" width="1.25em" />
                </DropdownToggle>
              )}
            />
          </Widget.Controls>
        </Widget.Header>
        {isReady && (
          <Widget.Content aria-hidden={isCollapsed} sx={{ display: isCollapsed ? 'none' : 'block' }}>
            <Box p="3x"><Marlin actions={actions} state={state} /></Box>
          </Widget.Content>
        )}
      </Widget>
      {isControllerModalOpen && (
        <Controller
          controllerSettings={state.controller.settings}
          controllerState={state.controller.state}
          onClose={() => setIsControllerModalOpen(false)}
        />
      )}
    </WidgetConfigProvider>
  );
}

/**
 * @param {{ get: (path: string, defaultValue?: unknown) => unknown }} config
 */
function getInitialState(config) {
  return {
    connected: !!controller.connection.ident,
    controller: {
      settings: controller.settings || {},
      state: controller.state || {},
      type: controller.type,
    },
    heater: {
      extruder: config.get('heater.extruder', 0),
      heatedBed: config.get('heater.heatedBed', 0),
    },
    panel: {
      heaterControl: { expanded: config.get('panel.heaterControl.expanded') },
      modalGroups: { expanded: config.get('panel.modalGroups.expanded') },
      statusReports: { expanded: config.get('panel.statusReports.expanded') },
    },
  };
}

export default MarlinWidget;
