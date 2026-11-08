import { faCodeBranch, faCompress, faCopy, faEraser, faExpand } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Button,
  Dropdown,
  DropdownToggle,
  Space,
} from '@tonic-ui/react';
import { ChevronDownIcon, ChevronUpIcon, CloseIcon, DeleteIcon, MenuIcon, MoreIcon, RefreshIcon } from '@tonic-ui/react-icons';
import cx from 'classnames';
import React from 'react';
import Widget from '@app/components/Widget';
import widgetStyles from '@app/components/Widget/index.styl';
import i18n from '@app/lib/i18n';
import WidgetConfigProvider from '@app/widgets/shared/WidgetConfigProvider';
import WidgetEventProvider from '@app/widgets/shared/WidgetEventProvider';
import Console from './Console';
import styles from './index.styl';

/**
 * @param {{ widgetId: string, onFork: () => void, onRemove: () => void,
 * view: 'normal'|'collapsed'|'fullscreen', onViewChange: (view: string) => void,
 * sortable?: {handleClassName?: string, filterClassName?: string} }} props
 */
function ConsoleWidget({ widgetId, view, onViewChange, onFork, onRemove, sortable = {} }) {
  const isCollapsed = view === 'collapsed';
  const isFullscreen = view === 'fullscreen';
  const isForkedWidget = widgetId.match(/\w+:[\w\-]+/);

  return (
    <WidgetConfigProvider widgetId={widgetId}>
      <WidgetEventProvider>
        {(emitter) => (
          <Widget aria-label="Console widget" fullscreen={isFullscreen}>
            <Widget.Header>
              <Widget.Title>
                <Widget.Sortable className={sortable.handleClassName}>
                  <MenuIcon aria-hidden="true" size="1em" width="1.25em" />
                  <Space width="1x" />
                </Widget.Sortable>
                {isForkedWidget &&
                <FontAwesomeIcon icon={faCodeBranch} fixedWidth aria-hidden="true" />}
                {i18n._('Console')}
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
                  aria-label="Clear console"
                  title={i18n._('Clear all')}
                  onClick={() => emitter.emit('terminal:clear')}
                >
                  <DeleteIcon aria-hidden="true" size="1em" width="1.25em" />
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
                  {isCollapsed &&
                  <ChevronDownIcon aria-hidden="true" size="1em" width="1.25em" />}
                  {!isCollapsed &&
                  <ChevronUpIcon aria-hidden="true" size="1em" width="1.25em" />}
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
                  aria-label={!isFullscreen ? 'Enter full screen' : 'Exit full screen'}
                  title={!isFullscreen ? i18n._('Enter Full Screen') : i18n._('Exit Full Screen')}
                  onClick={() => onViewChange(isFullscreen ? 'normal' : 'fullscreen')}
                >
                  {isFullscreen &&
                  <FontAwesomeIcon icon={faCompress} fixedWidth aria-hidden="true" />}
                  {!isFullscreen &&
                  <FontAwesomeIcon icon={faExpand} fixedWidth aria-hidden="true" />}
                </Button>
                <Dropdown
                  style={{ display: 'flex', alignSelf: 'stretch' }}
                  items={[
                    {
                      value: 'refresh',
                      label: (
                        <>
                          <RefreshIcon aria-hidden="true" size="1em" width="1.25em" />
                          <Space width="2x" />
                          {i18n._('Refresh')}
                        </>
                      ),
                    },
                    {
                      value: 'selectAll',
                      label: (
                        <>
                          <i
                            aria-hidden="true"
                            className={cx(
                              styles.icon,
                              styles.selectAll
                            )}
                          />
                          <Space width="2x" />
                          {i18n._('Select All')}
                        </>
                      ),
                    },
                    {
                      value: 'copySelection',
                      label: (
                        <>
                          <FontAwesomeIcon icon={faCopy} fixedWidth aria-hidden="true" />
                          <Space width="2x" />
                          {i18n._('Copy Selection')}
                        </>
                      ),
                    },
                    {
                      value: 'clearSelection',
                      label: (
                        <>
                          <FontAwesomeIcon icon={faEraser} fixedWidth aria-hidden="true" />
                          <Space width="2x" />
                          {i18n._('Clear Selection')}
                        </>
                      ),
                    },
                    {
                      value: 'fullscreen',
                      label: (
                        <>
                          {!isFullscreen && (
                            <FontAwesomeIcon icon={faExpand} fixedWidth aria-hidden="true" />
                          )}
                          {isFullscreen && (
                            <FontAwesomeIcon icon={faCompress} fixedWidth aria-hidden="true" />
                          )}
                          <Space width="2x" />
                          {!isFullscreen ? i18n._('Enter Full Screen') : i18n._('Exit Full Screen')}
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
                  onChange={({ value: eventKey }) => {
                    if (eventKey === 'refresh') {
                      emitter.emit('terminal:refresh');
                    } else if (eventKey === 'selectAll') {
                      emitter.emit('terminal:selectAll');
                    } else if (eventKey === 'copySelection') {
                      if (typeof document.execCommand === 'function') {
                        document.execCommand('copy');
                      }
                    } else if (eventKey === 'clearSelection') {
                      emitter.emit('terminal:clearSelection');
                    } else if (eventKey === 'fullscreen') {
                      onViewChange(isFullscreen ? 'normal' : 'fullscreen');
                    } if (eventKey === 'fork') {
                      onFork();
                    } else if (eventKey === 'remove') {
                      onRemove();
                    }
                  }}
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
            <Widget.Content
              aria-hidden={isCollapsed}
              className={cx(
                styles.widgetContent,
                { [styles.hidden]: isCollapsed },
                { [styles.fullscreen]: isFullscreen }
              )}
            >
              <Console
                isFullscreen={isFullscreen}
              />
            </Widget.Content>
          </Widget>
        )}
      </WidgetEventProvider>
    </WidgetConfigProvider>
  );
}

export default ConsoleWidget;
