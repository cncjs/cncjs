import { faCodeBranch, faCompress, faExpand } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Button,
  Dropdown,
  DropdownToggle,
  Space,
} from '@tonic-ui/react';
import { ChevronDownIcon, ChevronUpIcon, MenuIcon, MoreIcon } from '@tonic-ui/react-icons';
import PropTypes from 'prop-types';
import React from 'react';
import Widget from '@app/components/Widget';
import widgetStyles from '@app/components/Widget/index.styl';
import i18n from '@app/lib/i18n';
import WidgetConfigProvider from '@app/widgets/shared/WidgetConfigProvider';
import Connection from './Connection';

function ConnectionWidget({
  widgetId,
  view,
  onViewChange,
  sortable,
}) {
  const isCollapsed = view === 'collapsed';
  const isFullscreen = view === 'fullscreen';
  const isForkedWidget = widgetId.match(/\w+:[\w\-]+/);

  return (
    <WidgetConfigProvider widgetId={widgetId}>
      <Widget aria-label="Connection widget" fullscreen={isFullscreen}>
        <Widget.Header>
          <Widget.Title>
            <Widget.Sortable className={sortable.handleClassName}>
              <MenuIcon aria-hidden="true" size="1em" width="1.25em" />
              <Space width="1x" />
            </Widget.Sortable>
            {isForkedWidget &&
            <FontAwesomeIcon icon={faCodeBranch} fixedWidth aria-hidden="true" />}
            {i18n._('Connection')}
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
                onClick={() => onViewChange(isFullscreen ? 'normal' : 'fullscreen')}
              >
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
              ]}
              onChange={({ value: eventKey }) => {
                if (eventKey === 'fullscreen') {
                  onViewChange(isFullscreen ? 'normal' : 'fullscreen');
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
          style={{
            display: (isCollapsed ? 'none' : 'block'),
          }}
        >
          <Connection />
        </Widget.Content>
      </Widget>
    </WidgetConfigProvider>
  );
}

ConnectionWidget.propTypes = {
  widgetId: PropTypes.string.isRequired,
  view: PropTypes.oneOf(['normal', 'collapsed', 'fullscreen']).isRequired,
  onViewChange: PropTypes.func.isRequired,
  sortable: PropTypes.object
};

export default ConnectionWidget;
