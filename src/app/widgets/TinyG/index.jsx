import { faCodeBranch, faCompress, faExpand } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button, Dropdown, DropdownToggle, Space } from '@tonic-ui/react';
import { AppIcon, ChevronDownIcon, ChevronUpIcon, CloseIcon, InfoIcon, MenuIcon, MoreIcon } from '@tonic-ui/react-icons';
import React, { useEffect, useState } from 'react';
import Widget from '@app/components/Widget';
import widgetStyles from '@app/components/Widget/index.styl';
import { TINYG } from '@app/constants/controller';
import controller from '@app/lib/controller';
import i18n from '@app/lib/i18n';
import WidgetConfigProvider from '@app/widgets/shared/WidgetConfigProvider';
import Controller from './Controller';
import TinyG from './TinyG';

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

const getControllerSnapshot = () => ({
  settings: controller.settings || {},
  state: controller.state || {},
  type: controller.type,
});

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
function TinyGWidget({ onFork, onRemove, onViewChange, sortable, view, widgetId }) {
  const [connected, setConnected] = useState(Boolean(controller.connection.ident));
  const [controllerData, setControllerData] = useState(getControllerSnapshot);
  const [isControllerModalOpen, setIsControllerModalOpen] = useState(false);

  useEffect(() => {
    const listeners = {
      'connection:open': () => setConnected(true),
      'connection:change': (connectionState, isConnected) => {
        setConnected(Boolean(isConnected));
        if (!isConnected) {
          setControllerData(getControllerSnapshot());
          setIsControllerModalOpen(false);
        }
      },
      'controller:settings': (type, settings) => {
        if (type !== TINYG) {
          return;
        }
        setControllerData(current => ({
          ...current,
          settings: { ...current.settings, ...settings },
          type,
        }));
      },
      'controller:state': (type, state) => {
        if (type !== TINYG) {
          return;
        }
        setControllerData(current => ({
          ...current,
          state: { ...current.state, ...state },
          type,
        }));
      },
    };

    Object.entries(listeners).forEach(([eventName, callback]) => {
      controller.addListener(eventName, callback);
    });

    return () => {
      Object.entries(listeners).forEach(([eventName, callback]) => {
        controller.removeListener(eventName, callback);
      });
    };
  }, []);

  const isCollapsed = view === 'collapsed';
  const isFullscreen = view === 'fullscreen';
  const isReady = connected && controllerData.type === TINYG;
  const isForkedWidget = widgetId.match(/\w+:[\w\-]+/);

  return (
    <WidgetConfigProvider widgetId={widgetId}>
      <Widget aria-label="TinyG widget" fullscreen={isFullscreen}>
        <Widget.Header>
          <Widget.Title>
            <Widget.Sortable className={sortable.handleClassName}>
              <MenuIcon aria-hidden="true" size="1em" width="1.25em" />
              <Space width="1x" />
            </Widget.Sortable>
            {isForkedWidget && <FontAwesomeIcon icon={faCodeBranch} fixedWidth aria-hidden="true" />}
            TinyG
          </Widget.Title>
          <Widget.Controls className={sortable.filterClassName}>
            {isReady && (
              <Button variant="ghost" className={widgetStyles.widgetButton} sx={widgetActionSx} aria-label="TinyG controller info" onClick={() => setIsControllerModalOpen(true)}>
                <InfoIcon aria-hidden="true" size="1em" />
              </Button>
            )}
            {isReady && (
              <Dropdown
                style={{ display: 'flex', alignSelf: 'stretch' }}
                items={[
                  {
                    label: i18n._('Status Report (?)'),
                    action: () => controller.writeln('?'),
                  },
                  {
                    label: i18n._('Queue Flush (%)'),
                    action: () => {
                      controller.writeln('!%');
                      controller.writeln('{"qr":""}');
                    },
                  },
                  {
                    label: i18n._('Kill Job (^d)'),
                    action: () => controller.write('\x04'),
                  },
                  {
                    label: i18n._('Clear Alarm ($clear)'),
                    action: () => controller.command('unlock'),
                  },
                  { type: 'divider' },
                  {
                    label: i18n._('Help'),
                    action: () => controller.writeln('h'),
                  },
                  {
                    label: i18n._('Show System Settings'),
                    action: () => controller.writeln('$sys'),
                  },
                  {
                    label: i18n._('Show All Settings'),
                    action: () => controller.writeln('$$'),
                  },
                  {
                    label: i18n._('List Self Tests'),
                    action: () => controller.writeln('$test'),
                  },
                  { type: 'divider' },
                  {
                    label: i18n._('Restore Defaults'),
                    action: () => controller.writeln('$defa=1'),
                  },
                ]}
                onChange={(item) => item.action?.()}
                renderToggle={() => (
                  <DropdownToggle aria-label="TinyG commands" className={widgetStyles.widgetButton}>
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
            <TinyG controllerData={controllerData} />
          </Widget.Content>
        )}
      </Widget>
      {isControllerModalOpen && (
        <Controller controllerData={controllerData} onClose={() => setIsControllerModalOpen(false)} />
      )}
    </WidgetConfigProvider>
  );
}

export default TinyGWidget;
