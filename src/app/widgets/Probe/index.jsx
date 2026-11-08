import { faCodeBranch } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Box,
  Button,
  Dropdown,
  DropdownToggle,
  Space,
} from '@tonic-ui/react';
import { ChevronDownIcon, ChevronUpIcon, MenuIcon, MoreIcon } from '@tonic-ui/react-icons';
import React from 'react';
import Widget from '@app/components/Widget';
import widgetStyles from '@app/components/Widget/index.styl';
import i18n from '@app/lib/i18n';
import WidgetConfigProvider from '@app/widgets/shared/WidgetConfigProvider';
import Probe from './Probe';

/**
 * @param {{widgetId: string, onFork: Function, onRemove: Function, view: string, onViewChange: Function, sortable?: object}} props
 */
function ProbeWidget({
  widgetId,
  onFork,
  onRemove,
  view,
  onViewChange,
  sortable = {},
}) {
  const isCollapsed = view === 'collapsed';
  const isFullscreen = view === 'fullscreen';
  const isForkedWidget = widgetId.match(/\w+:[\w\-]+/);
  const select = (key) => {
    if (key === 'fullscreen') {
      onViewChange(isFullscreen ? 'normal' : 'fullscreen');
    }
    if (key === 'fork') {
      onFork();
    }
    if (key === 'remove') {
      onRemove();
    }
  };
  return (
    <WidgetConfigProvider widgetId={widgetId}>
      <Widget aria-label={i18n._('Probe widget')} fullscreen={isFullscreen}>
        <Widget.Header>
          <Widget.Title>
            <Widget.Sortable className={sortable.handleClassName}>
              <MenuIcon aria-hidden="true" size="1em" width="1.25em" />
              <Space width="1x" />
            </Widget.Sortable>
            {isForkedWidget && (
              <FontAwesomeIcon icon={faCodeBranch} fixedWidth aria-hidden="true" />
            )}
            {i18n._('Probe')}
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
            <Dropdown
              style={{ display: 'flex', alignSelf: 'stretch' }}
              items={[
                {
                  value: 'fullscreen',
                  label: i18n._('Full Screen'),
                },
                {
                  value: 'fork',
                  label: i18n._('Fork Widget'),
                },
                {
                  value: 'remove',
                  label: i18n._('Remove Widget'),
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
          <Box sx={{ width: '100%', padding: '.75rem' }}>
            <Probe />
          </Box>
        </Widget.Content>
      </Widget>
    </WidgetConfigProvider>
  );
}
export default ProbeWidget;
