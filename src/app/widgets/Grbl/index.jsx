import { faCodeBranch, faCompress, faExpand } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Box,
  Button,
  Dropdown,
  DropdownToggle,
  Space,
} from '@tonic-ui/react';
import { AppIcon, ChevronDownIcon, ChevronUpIcon, CloseIcon, InfoIcon, MenuIcon, MoreIcon } from '@tonic-ui/react-icons';
import _get from 'lodash/get';
import React, { useState } from 'react';
import { connect } from 'react-redux';
import Widget from '@app/components/Widget';
import widgetStyles from '@app/components/Widget/index.styl';
import i18n from '@app/lib/i18n';
import controller from '@app/lib/controller';
import WidgetConfigProvider from '@app/widgets/shared/WidgetConfigProvider';
import {
  GRBL,
} from '@app/constants/controller';
import {
  CONNECTION_STATE_CONNECTED,
} from '@app/constants/connection';
import QueueReports from './QueueReports';
import StatusReports from './StatusReports';
import ModalGroups from './ModalGroups';
import FeedOverride from './FeedOverride';
import SpindleOverride from './SpindleOverride';
import RapidOverride from './RapidOverride';
import ControllerModal from './modals/ControllerModal';

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
 *   isReady?: boolean,
 *   onFork: () => void,
 *   onRemove: () => void,
 *   onViewChange: (view: 'normal' | 'collapsed' | 'fullscreen') => void,
 *   sortable: { filterClassName: string, handleClassName: string },
 *   view: 'normal' | 'collapsed' | 'fullscreen',
 *   widgetId: string,
 * }} props
 */
function GrblWidget({
  isReady,
  onFork,
  onRemove,
  onViewChange,
  sortable,
  view,
  widgetId,
}) {
  const [isControllerModalOpen, setIsControllerModalOpen] = useState(false);
  const isCollapsed = view === 'collapsed';
  const isFullscreen = view === 'fullscreen';
  const isForkedWidget = widgetId.match(/\w+:[\w\-]+/);

  return (
    <WidgetConfigProvider widgetId={widgetId}>
      <Widget aria-label="Grbl widget" fullscreen={isFullscreen}>
        <Widget.Header>
          <Widget.Title>
            <Widget.Sortable className={sortable.handleClassName}>
              <MenuIcon aria-hidden="true" size="1em" width="1.25em" />
              <Space width="1x" />
            </Widget.Sortable>
            {isForkedWidget &&
            <FontAwesomeIcon icon={faCodeBranch} fixedWidth aria-hidden="true" />}
            Grbl
          </Widget.Title>
          <Widget.Controls className={sortable.filterClassName}>
            {isReady && (
              <Button
                variant="ghost"
                className={widgetStyles.widgetButton}
                sx={widgetActionSx}
                aria-label="Grbl controller info"
                onClick={(event) => {
                  setIsControllerModalOpen(true);
                }}
              >
                <InfoIcon aria-hidden="true" size="1em" />
              </Button>
            )}
            {isReady && (
              <Dropdown
                style={{ display: 'flex', alignSelf: 'stretch' }}
                items={[
                  {
                    label: i18n._('Status Report (?)'),
                    action: () => controller.write('?'),
                  },
                  {
                    label: i18n._('Check G-code Mode ($C)'),
                    action: () => controller.writeln('$C'),
                  },
                  {
                    label: i18n._('Homing ($H)'),
                    action: () => controller.command('homing'),
                  },
                  {
                    label: i18n._('Kill Alarm Lock ($X)'),
                    action: () => controller.command('unlock'),
                  },
                  {
                    label: i18n._('Sleep ($SLP)'),
                    action: () => controller.command('sleep'),
                  },
                  { type: 'divider' },
                  {
                    label: i18n._('Help ($)'),
                    action: () => controller.writeln('$'),
                  },
                  {
                    label: i18n._('Settings ($$)'),
                    action: () => controller.writeln('$$'),
                  },
                  {
                    label: i18n._('View G-code Parameters ($#)'),
                    action: () => controller.writeln('$#'),
                  },
                  {
                    label: i18n._('View G-code Parser State ($G)'),
                    action: () => controller.writeln('$G'),
                  },
                  {
                    label: i18n._('View Build Info ($I)'),
                    action: () => controller.writeln('$I'),
                  },
                  {
                    label: i18n._('View Startup Blocks ($N)'),
                    action: () => controller.writeln('$N'),
                  },
                ]}
                onChange={(item) => item.action?.()}
                renderToggle={() => (
                  <DropdownToggle aria-label="Grbl commands" className={widgetStyles.widgetButton}>
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
                {isCollapsed &&
                <ChevronDownIcon aria-hidden="true" size="1em" width="1.25em" />}
                {!isCollapsed &&
                <ChevronUpIcon aria-hidden="true" size="1em" width="1.25em" />}
              </Button>
            )}
            {isFullscreen && (
              <Button
                variant="ghost"
                className={widgetStyles.widgetButton}
                sx={widgetActionSx}
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
          <Widget.Content
            aria-hidden={isCollapsed}
            sx={{ display: (isCollapsed ? 'none' : 'block') }}
          >
            <Box p="3x">
              <Box mb="3x">
                <FeedOverride />
                <SpindleOverride />
                <RapidOverride />
              </Box>
              <Box sx={{ '> :not(:first-child)': { borderTop: 0 } }}>
                <QueueReports />
                <StatusReports />
                <ModalGroups />
              </Box>
            </Box>
          </Widget.Content>
        )}
      </Widget>
      {isControllerModalOpen && (
        <ControllerModal onClose={() => setIsControllerModalOpen(false)} />
      )}
    </WidgetConfigProvider>
  );
}

export default connect(store => {
  const controllerType = _get(store, 'controller.type');
  const connectionState = _get(store, 'connection.state');
  const isReady = (controllerType === GRBL) && (connectionState === CONNECTION_STATE_CONNECTED);

  return {
    isReady,
  };
})(GrblWidget);
