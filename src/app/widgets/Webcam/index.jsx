import { faCodeBranch, faCompress, faExpand, faToggleOff, faToggleOn } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Button,
  Dropdown,
  DropdownToggle,
  Space,
} from '@tonic-ui/react';
import { ChevronDownIcon, ChevronUpIcon, CloseIcon, MenuIcon, MoreIcon, RefreshIcon, SettingsIcon } from '@tonic-ui/react-icons';
import React, { useState } from 'react';
import Widget from '@app/components/Widget';
import widgetStyles from '@app/components/Widget/index.styl';
import i18n from '@app/lib/i18n';
import WidgetConfigProvider from '@app/widgets/shared/WidgetConfigProvider';
import WidgetConfigConsumer from '@app/widgets/shared/WidgetConfigConsumer';
import WidgetEventProvider from '@app/widgets/shared/WidgetEventProvider';
import SettingsModal from './modals/SettingsModal';
import Webcam from './Webcam';

/**
 * @param {{ widgetId: string, onFork: () => void, onRemove: () => void, view: 'normal'|'collapsed'|'fullscreen', onViewChange: (view: string) => void, sortable: object, config: object, emitter: object }} props
 */
function WebcamWidgetBody({ widgetId, onFork, onRemove, view, onViewChange, sortable, config, emitter }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isCollapsed = view === 'collapsed';
  const isFullscreen = view === 'fullscreen';
  const disabled = Boolean(config.get('disabled', true));
  const isForkedWidget = /\w+:[\w\-]+/.test(widgetId);

  const onSelect = (eventKey) => {
    if (eventKey === 'settings') {
      setSettingsOpen(true);
    } else if (eventKey === 'fullscreen') {
      onViewChange(isFullscreen ? 'normal' : 'fullscreen');
    } else if (eventKey === 'fork') {
      onFork();
    } else if (eventKey === 'remove') {
      onRemove();
    }
  };

  return (
    <Widget aria-label={i18n._('Webcam widget')} fullscreen={isFullscreen}>
      <Widget.Header>
        <Widget.Title>
          <Widget.Sortable className={sortable.handleClassName}>
            <MenuIcon aria-hidden="true" size="1em" width="1.25em" />
            <Space width="1x" />
          </Widget.Sortable>
          {isForkedWidget && <FontAwesomeIcon icon={faCodeBranch} fixedWidth aria-hidden="true" />}
          {i18n._('Webcam')}
        </Widget.Title>
        <Widget.Controls className={sortable.filterClassName}>
          <Button
            className={widgetStyles.widgetButton}
            sx={{
              border: 0,
              minHeight: 0,
              borderRadius: 0,
              backgroundColor: 'inherit',
              color: 'inherit',
              _hover: { backgroundColor: 'actions.hovered', color: 'inherit' },
              _active: { backgroundColor: 'actions.hovered', color: 'inherit' },
              _disabled: { backgroundColor: 'inherit', color: 'text.disabled' },
            }}
            aria-label={disabled ? 'Enable Webcam' : 'Disable Webcam'}
            title={disabled ? i18n._('Enable') : i18n._('Disable')}
            onClick={() => config.set('disabled', !disabled)}
          >
            <FontAwesomeIcon icon={disabled ? faToggleOff : faToggleOn} fixedWidth aria-hidden="true" />
          </Button>
          <Button
            className={widgetStyles.widgetButton}
            sx={{
              border: 0,
              minHeight: 0,
              borderRadius: 0,
              backgroundColor: 'inherit',
              color: 'inherit',
              _hover: { backgroundColor: 'actions.hovered', color: 'inherit' },
              _active: { backgroundColor: 'actions.hovered', color: 'inherit' },
              _disabled: { backgroundColor: 'inherit', color: 'text.disabled' },
            }}
            aria-label="Refresh webcam"
            disabled={disabled}
            onClickCapture={(event) => {
              if (disabled) {
                event.preventDefault();
                event.stopPropagation();
              }
            }}
            title={i18n._('Refresh')}
            onClick={(event) => {
              if (disabled) {
                event.preventDefault();
                event.stopPropagation();
                return;
              }
              emitter.emit('refresh');
            }}
          >
            <RefreshIcon aria-hidden="true" size="1em" width="1.25em" />
          </Button>
          <Button
            className={widgetStyles.widgetButton}
            sx={{
              border: 0,
              minHeight: 0,
              borderRadius: 0,
              backgroundColor: 'inherit',
              color: 'inherit',
              _hover: { backgroundColor: 'actions.hovered', color: 'inherit' },
              _active: { backgroundColor: 'actions.hovered', color: 'inherit' },
              _disabled: { backgroundColor: 'inherit', color: 'text.disabled' },
            }}
            aria-label={isCollapsed ? 'Expand' : 'Collapse'}
            aria-expanded={!isCollapsed}
            disabled={isFullscreen}
            onClickCapture={(event) => {
              if (isFullscreen) {
                event.preventDefault();
                event.stopPropagation();
              }
            }}
            title={isCollapsed ? i18n._('Expand') : i18n._('Collapse')}
            onClick={(event) => {
              if (isFullscreen) {
                event.preventDefault();
                event.stopPropagation();
                return;
              }
              onViewChange(isCollapsed ? 'normal' : 'collapsed');
            }}
          >
            {isCollapsed ? <ChevronDownIcon aria-hidden="true" size="1em" width="1.25em" /> : <ChevronUpIcon aria-hidden="true" size="1em" width="1.25em" />}
          </Button>
          {isFullscreen && (
            <Button
              className={widgetStyles.widgetButton}
              sx={{
                border: 0,
                minHeight: 0,
                borderRadius: 0,
                backgroundColor: 'inherit',
                color: 'inherit',
                _hover: { backgroundColor: 'actions.hovered', color: 'inherit' },
                _active: { backgroundColor: 'actions.hovered', color: 'inherit' },
                _disabled: { backgroundColor: 'inherit', color: 'text.disabled' },
              }}
              title={i18n._('Exit Full Screen')}
              onClick={() => onViewChange('normal')}
            >
              <FontAwesomeIcon icon={faCompress} fixedWidth aria-hidden="true" />
            </Button>
          )}
          <Dropdown
            style={{ display: 'flex', alignSelf: 'stretch' }}
            items={[
              {
                value: 'settings',
                label: (
                  <>
                    <SettingsIcon aria-hidden="true" size="1em" width="1.25em" />
                    <Space width="2x" />
                    {i18n._('Settings')}
                  </>
                ),
              },
              {
                value: 'fullscreen',
                label: (
                  <>
                    <FontAwesomeIcon icon={isFullscreen ? faCompress : faExpand} fixedWidth aria-hidden="true" />
                    <Space width="2x" />
                    {i18n._(isFullscreen ? 'Exit Full Screen' : 'Enter Full Screen')}
                  </>
                ),
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
            onChange={({ value }) => onSelect(value)}
            renderToggle={() => (
              <DropdownToggle
                className={widgetStyles.widgetButton}
                aria-label="More options"
                title={i18n._('More')}
              >
                <MoreIcon aria-hidden="true" size="1em" width="1.25em" />
              </DropdownToggle>
            )}
          />
        </Widget.Controls>
      </Widget.Header>
      <Widget.Content aria-hidden={isCollapsed} sx={{ display: isCollapsed ? 'none' : 'block' }}>
        <Webcam disabled={disabled} isFullscreen={isFullscreen} />
      </Widget.Content>
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </Widget>
  );
}

/**
 * @param {{ widgetId: string, onFork: () => void, onRemove: () => void, view: 'normal'|'collapsed'|'fullscreen', onViewChange: (view: string) => void, sortable?: object }} props
 */
function WebcamWidget({ widgetId, onFork, onRemove, view, onViewChange, sortable = {} }) {
  return (
    <WidgetConfigProvider key={widgetId} widgetId={widgetId}>
      <WidgetConfigConsumer>
        {config => (
          <WidgetEventProvider>
            {emitter => (
              <WebcamWidgetBody
                widgetId={widgetId} onFork={onFork} onRemove={onRemove}
                view={view} onViewChange={onViewChange} sortable={sortable}
                config={config} emitter={emitter}
              />
            )}
          </WidgetEventProvider>
        )}
      </WidgetConfigConsumer>
    </WidgetConfigProvider>
  );
}

export default WebcamWidget;
