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
import Custom from './Custom';
import SettingsModal from './modals/SettingsModal';

/**
 * @param {{widgetId: string, onFork: Function, onRemove: Function, view: string, onViewChange: Function, sortable: object, onOpenSettingsModal: Function, config: object, emitter: object}} props
 */
function CustomWidgetBody({
  widgetId,
  onFork,
  onRemove,
  view,
  onViewChange,
  sortable,
  onOpenSettingsModal,
  config,
  emitter,
}) {
  const isCollapsed = view === 'collapsed';
  const isFullscreen = view === 'fullscreen';
  const disabled = Boolean(config.get('disabled'));
  const title = config.get('title', '');
  const isForkedWidget = /\w+:[\w\-]+/.test(widgetId);

  const select = (eventKey) => {
    if (eventKey === 'settings') {
      onOpenSettingsModal();
    } else if (eventKey === 'fullscreen') {
      onViewChange(isFullscreen ? 'normal' : 'fullscreen');
    } else if (eventKey === 'fork') {
      onFork();
    } else if (eventKey === 'remove') {
      onRemove();
    }
  };

  return (
    <Widget aria-label={i18n._('Custom widget')} fullscreen={isFullscreen}>
      <Widget.Header>
        <Widget.Title title={title}>
          <Widget.Sortable className={sortable.handleClassName}>
            <MenuIcon aria-hidden="true" size="1em" width="1.25em" />
            <Space width="1x" />
          </Widget.Sortable>
          {isForkedWidget && (
            <FontAwesomeIcon icon={faCodeBranch} fixedWidth aria-hidden="true" />
          )}
          {title}
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
            aria-label={i18n._(disabled ? 'Enable widget' : 'Disable widget')}
            title={disabled ? i18n._('Enable') : i18n._('Disable')}
            onClick={() => config.set('disabled', !disabled)}
          >
            <FontAwesomeIcon
              icon={disabled ? faToggleOff : faToggleOn}
              fixedWidth
              aria-hidden="true"
            />
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
            aria-label={i18n._('Refresh content')}
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
              emitter.emit('refresh', true);
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
            aria-label={i18n._(isCollapsed ? 'Expand' : 'Collapse')}
            aria-expanded={!isCollapsed}
            disabled={isFullscreen}
            onClickCapture={(event) => {
              if (isFullscreen) {
                event.preventDefault();
                event.stopPropagation();
              }
            }}
            title={i18n._(isCollapsed ? 'Expand' : 'Collapse')}
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
                    <FontAwesomeIcon
                      icon={isFullscreen ? faCompress : faExpand}
                      fixedWidth
                      aria-hidden="true"
                    />
                    <Space width="2x" />
                    {isFullscreen ? i18n._('Exit Full Screen') : i18n._('Enter Full Screen')}
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
            onChange={({ value }) => select(value)}
            renderToggle={() => (
              <DropdownToggle
                className={widgetStyles.widgetButton}
                aria-label={i18n._('More options')}
                title={i18n._('More')}
              >
                <MoreIcon aria-hidden="true" size="1em" width="1.25em" />
              </DropdownToggle>
            )}
          />
        </Widget.Controls>
      </Widget.Header>
      <Widget.Content
        aria-hidden={isCollapsed}
        sx={{ display: isCollapsed ? 'none' : 'block' }}
      >
        <Custom disabled={disabled} />
      </Widget.Content>
    </Widget>
  );
}

/**
 * @param {{widgetId: string, onFork: Function, onRemove: Function, view: string, onViewChange: Function, sortable?: object}} props
 */
function CustomWidget({
  widgetId,
  onFork,
  onRemove,
  view,
  onViewChange,
  sortable = {},
}) {
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  return (
    <WidgetConfigProvider key={widgetId} widgetId={widgetId}>
      <WidgetConfigConsumer>
        {config => (
          <WidgetEventProvider>
            {emitter => (
              <>
                <CustomWidgetBody
                  widgetId={widgetId}
                  onFork={onFork}
                  onRemove={onRemove}
                  view={view}
                  onViewChange={onViewChange}
                  sortable={sortable}
                  onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
                  config={config}
                  emitter={emitter}
                />
                {isSettingsModalOpen && (
                  <SettingsModal onClose={() => setIsSettingsModalOpen(false)} />
                )}
              </>
            )}
          </WidgetEventProvider>
        )}
      </WidgetConfigConsumer>
    </WidgetConfigProvider>
  );
}

export default CustomWidget;
