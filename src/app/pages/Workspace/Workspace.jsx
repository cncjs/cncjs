import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Box,
  Button,
  ButtonGroup,
  Flex,
  Space,
  Text,
} from '@tonic-ui/react';
import _difference from 'lodash/difference';
import _get from 'lodash/get';
import _includes from 'lodash/includes';
import _pick from 'lodash/pick';
import _pullAll from 'lodash/pullAll';
import _size from 'lodash/size';
import _throttle from 'lodash/throttle';
import Dropzone from 'react-dropzone';
import pubsub from 'pubsub-js';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { connect } from 'react-redux';
import {
  CONNECTION_STATE_CONNECTED,
} from '@app/constants/connection';
import {
  WORKFLOW_STATE_IDLE,
} from '@app/constants/workflow';
import controller from '@app/lib/controller';
import i18n from '@app/lib/i18n';
import log from '@app/lib/log';
import { useLoadGCodeMutation } from '@app/queries/gcode';
import config from '@app/store/config';
import * as widgetManager from './widget-manager';
import DefaultWidgets from './DefaultWidgets';
import PrimaryWidgets from './PrimaryWidgets';
import SecondaryWidgets from './SecondaryWidgets';
import { useWidgetGroup } from './useWidgetGroup';
import { useWorkspaceLayout } from './useWorkspaceLayout';
import { WIDGET_REGISTRY } from './widgetRegistry';
import { selectVisibleWidgetIds } from './widgetLayoutState';
import FeederPaused from './modals/FeederPaused';
import FeederWait from './modals/FeederWait';
import ServerDisconnected from './modals/ServerDisconnected';
import styles from './index.styl';
import {
  MODAL_NONE,
  MODAL_FEEDER_PAUSED,
  MODAL_FEEDER_WAIT,
  MODAL_SERVER_DISCONNECTED
} from './constants';

const WAIT = '%wait';

const startWaiting = () => {
  // Adds the 'wait' class to <html>
  const root = document.documentElement;
  root.classList.add('wait');
};
const stopWaiting = () => {
  // Adds the 'wait' class to <html>
  const root = document.documentElement;
  root.classList.remove('wait');
};

/**
 * Owns Workspace-level modal, panel, drag/drop, and controller lifecycle state.
 *
 * @param {Object} props Workspace view props.
 * @returns {JSX.Element}
 */
const Workspace = ({
  isConnected,
  className,
  workspaceLayout,
  primaryWidgetIds,
  secondaryWidgetIds,
  location,
  ...props
}) => {
  const [modal, setModal] = useState({
    name: MODAL_NONE,
    params: {}
  });
  const [isDraggingWidget, setIsDraggingWidget] = useState(false);
  const [, setIsUploading] = useState(false);
  const [showPrimaryContainer, setShowPrimaryContainer] = useState(
    () => config.get('workspace.container.primary.show')
  );
  const [showSecondaryContainer, setShowSecondaryContainer] = useState(
    () => config.get('workspace.container.secondary.show')
  );
  const [inactiveCount, setInactiveCount] = useState(
    () => _size(widgetManager.getInactiveWidgets())
  );
  const loadGCodeMutation = useLoadGCodeMutation();
  const mountedRef = useRef(false);
  const layoutRef = useRef({
    showPrimaryContainer,
    showSecondaryContainer,
  });
  const locationRef = useRef(location);
  const previousPathnameRef = useRef(location?.pathname);
  layoutRef.current = {
    showPrimaryContainer,
    showSecondaryContainer,
  };
  locationRef.current = location;

  const openModal = useCallback((name = MODAL_NONE, params = {}) => {
    setModal({ name, params });
  }, []);

  const closeModal = useCallback(() => {
    setModal({
      name: MODAL_NONE,
      params: {}
    });
  }, []);

  const handleFeederStatus = useCallback((status) => {
    const { hold, holdReason } = { ...status };

    setModal(currentModal => {
      if (!hold) {
        if (_includes([MODAL_FEEDER_PAUSED, MODAL_FEEDER_WAIT], currentModal.name)) {
          return {
            name: MODAL_NONE,
            params: {}
          };
        }
        return currentModal;
      }

      const { err, data, msg } = { ...holdReason };

      if (err) {
        return {
          name: MODAL_FEEDER_PAUSED,
          params: {
            title: i18n._('Error'),
            message: msg,
          }
        };
      }

      if (data === WAIT) {
        return {
          name: MODAL_FEEDER_WAIT,
          params: {
            title: '%wait',
            message: msg,
          }
        };
      }

      const title = {
        'M0': i18n._('M0 Program Pause'),
        'M1': i18n._('M1 Program Pause'),
        'M2': i18n._('M2 Program End'),
        'M30': i18n._('M30 Program End'),
        'M6': i18n._('M6 Tool Change'),
        'M109': i18n._('M109 Set Extruder Temperature'),
        'M190': i18n._('M190 Set Heated Bed Temperature')
      }[data] || data;

      return {
        name: MODAL_FEEDER_PAUSED,
        params: {
          title,
          message: msg,
        }
      };
    });
  }, []);

  const controllerEvents = useMemo(() => ({
    connect: () => {
      if (controller.connected) {
        closeModal();
      } else {
        openModal(MODAL_SERVER_DISCONNECTED);
      }
    },
    connect_error: () => {
      if (controller.connected) {
        closeModal();
      } else {
        openModal(MODAL_SERVER_DISCONNECTED);
      }
    },
    disconnect: () => {
      if (controller.connected) {
        closeModal();
      } else {
        openModal(MODAL_SERVER_DISCONNECTED);
      }
    },
    'feeder:status': handleFeederStatus,
  }), [closeModal, handleFeederStatus, openModal]);

  useEffect(() => {
    Object.keys(controllerEvents).forEach(eventName => {
      controller.addListener(eventName, controllerEvents[eventName]);
    });

    return () => {
      Object.keys(controllerEvents).forEach(eventName => {
        controller.removeListener(eventName, controllerEvents[eventName]);
      });
    };
  }, [controllerEvents]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      stopWaiting();
    };
  }, []);

  const publishResizeEvent = useCallback(() => {
    const {
      showPrimaryContainer: showPrimary,
      showSecondaryContainer: showSecondary,
    } = layoutRef.current;

    { // Mobile-Friendly View
      const disableHorizontalScroll = !(showPrimary && showSecondary);

      if (locationRef.current?.pathname === '/workspace' && disableHorizontalScroll) {
        // Disable horizontal scroll
        document.body.scrollLeft = 0;
        document.body.style.overflowX = 'hidden';
      } else {
        // Enable horizontal scroll
        document.body.style.overflowX = '';
      }
    }

    // The workspace layout is a flex row and the default container is a
    // flex item (flex: 1 1 auto), so the panels reflow natively when they
    // are toggled. Publishing 'resize' lets the visualizer re-measure its
    // canvas against the new width.
    pubsub.publish('resize'); // Also see "widgets/Visualizer"
  }, []);

  useEffect(() => {
    const previousPathname = previousPathnameRef.current;
    previousPathnameRef.current = location?.pathname;

    if (previousPathname !== location?.pathname) {
      publishResizeEvent();
    }
  }, [location?.pathname, publishResizeEvent]);

  const didMountLayoutRef = useRef(false);
  useEffect(() => {
    if (didMountLayoutRef.current) {
      config.set('workspace.container.primary.show', showPrimaryContainer);
      config.set('workspace.container.secondary.show', showSecondaryContainer);
    } else {
      didMountLayoutRef.current = true;
    }

    publishResizeEvent();
  }, [publishResizeEvent, showPrimaryContainer, showSecondaryContainer]);

  useEffect(() => {
    const onResizeThrottled = _throttle(publishResizeEvent, 50);
    const timeoutId = setTimeout(publishResizeEvent, 0);
    window.addEventListener('resize', onResizeThrottled);

    return () => {
      window.removeEventListener('resize', onResizeThrottled);
      onResizeThrottled.cancel();
      clearTimeout(timeoutId);
      document.body.style.overflowX = '';
    };
  }, [publishResizeEvent]);

  const onDrop = useCallback((files) => {
    const file = files[0];
    if (!file || !mountedRef.current) {
      return;
    }

    const reader = new FileReader();

    reader.onloadend = (event) => {
      const { result, error } = event.target;

      if (error) {
        log.error(error);
        return;
      }

      if (!mountedRef.current) {
        return;
      }

      log.debug('FileReader:', _pick(file, [
        'lastModified',
        'lastModifiedDate',
        'meta',
        'name',
        'size',
        'type'
      ]));

      startWaiting();
      setIsUploading(true);

      const meta = {
        name: file.name,
        content: result,
      };

      loadGCodeMutation.mutate({
        meta,
        context: controller.context,
      }, {
        onSuccess: response => {
          const { name } = { ...(response?.body || response) };
          log.debug(`Loaded a G-code file: name=${name}`);
        },
        onError: () => {
          log.error('Failed to upload G-code file');
        },
        onSettled: () => {
          stopWaiting();
          if (mountedRef.current) {
            setIsUploading(false);
          }
        },
      });
    };

    try {
      reader.readAsText(file);
    } catch (err) {
      // Ignore error
    }
  }, [loadGCodeMutation, mountedRef]);

  const updateWidgetsForPrimaryContainer = useCallback(() => {
    widgetManager.show(({ activeWidgets, inactiveWidgets }) => {
      const widgets = Object.keys(config.get('widgets', {}))
        .filter(widgetId => {
          // e.g. "webcam" or "webcam:d8e6352f-80a9-475f-a4f5-3e9197a48a23"
          const name = widgetId.split(':')[0];
          return _includes(activeWidgets, name);
        });

      const defaultWidgets = config.get('workspace.container.default.widgets');
      const sortableWidgets = _difference(widgets, defaultWidgets);
      let primaryWidgets = config.get('workspace.container.primary.widgets');
      let secondaryWidgets = config.get('workspace.container.secondary.widgets');

      primaryWidgets = sortableWidgets.slice();
      _pullAll(primaryWidgets, secondaryWidgets);
      pubsub.publish('updatePrimaryWidgets', primaryWidgets);

      secondaryWidgets = sortableWidgets.slice();
      _pullAll(secondaryWidgets, primaryWidgets);
      pubsub.publish('updateSecondaryWidgets', secondaryWidgets);

      // Update inactive count
      setInactiveCount(_size(inactiveWidgets));
    });
  }, []);

  const updateWidgetsForSecondaryContainer = useCallback(() => {
    widgetManager.show(({ activeWidgets, inactiveWidgets }) => {
      const widgets = Object.keys(config.get('widgets', {}))
        .filter(widgetId => {
          // e.g. "webcam" or "webcam:d8e6352f-80a9-475f-a4f5-3e9197a48a23"
          const name = widgetId.split(':')[0];
          return _includes(activeWidgets, name);
        });

      const defaultWidgets = config.get('workspace.container.default.widgets');
      const sortableWidgets = _difference(widgets, defaultWidgets);
      let primaryWidgets = config.get('workspace.container.primary.widgets');
      let secondaryWidgets = config.get('workspace.container.secondary.widgets');

      secondaryWidgets = sortableWidgets.slice();
      _pullAll(secondaryWidgets, primaryWidgets);
      pubsub.publish('updateSecondaryWidgets', secondaryWidgets);

      primaryWidgets = sortableWidgets.slice();
      _pullAll(primaryWidgets, secondaryWidgets);
      pubsub.publish('updatePrimaryWidgets', primaryWidgets);

      // Update inactive count
      setInactiveCount(_size(inactiveWidgets));
    });
  }, []);

  const togglePrimaryContainer = useCallback(() => {
    setShowPrimaryContainer(value => !value);
  }, []);

  const toggleSecondaryContainer = useCallback(() => {
    setShowSecondaryContainer(value => !value);
  }, []);

  const onForkWidget = useCallback((widgetId) => {
    // TODO
  }, []);

  const onRemoveWidget = useCallback((widgetId) => {
    const inactiveWidgets = widgetManager.getInactiveWidgets();
    setInactiveCount(inactiveWidgets.length);
  }, []);

  const onDragStart = useCallback(() => {
    setIsDraggingWidget(true);
  }, []);

  const onDragEnd = useCallback(() => {
    setIsDraggingWidget(false);
  }, []);

  const hidePrimaryContainer = !showPrimaryContainer;
  const hideSecondaryContainer = !showSecondaryContainer;

  return (
    <Box className={`${className || ''} ${styles.workspace}`.trim()} {...props}>
      {modal.name === MODAL_FEEDER_PAUSED && (
        <FeederPaused
          title={modal.params.title}
          message={modal.params.message}
          onClose={closeModal}
        />
      )}
      {modal.name === MODAL_FEEDER_WAIT && (
        <FeederWait
          title={modal.params.title}
          message={modal.params.message}
          onClose={closeModal}
        />
      )}
      {modal.name === MODAL_SERVER_DISCONNECTED &&
      <ServerDisconnected />}
      <Dropzone
        disabled={controller.workflow.state !== WORKFLOW_STATE_IDLE}
        noClick={true}
        multiple={false}
        onDrop={(acceptedFiles, fileRejections, event) => {
          if (!isConnected) {
            return;
          }
          if (controller.workflow.state !== WORKFLOW_STATE_IDLE) {
            return;
          }
          if (isDraggingWidget) {
            return;
          }

          onDrop(acceptedFiles);
        }}
      >
        {({
          getRootProps,
          isDragActive,
        }) => (
          <Box {...getRootProps()}>
            {isDragActive && (
              <Flex
                align="center"
                bottom="0"
                justify="center"
                left="60px"
                pointerEvents="none"
                position="fixed"
                right="0"
                sx={{
                  backgroundColor: 'background.medium',
                  border: '4px dashed',
                  borderColor: isConnected ? 'info.border' : 'border.secondary',
                }}
                textAlign="center"
                top="48px"
                zIndex="1000"
              >
                <Text
                  color="text.secondary"
                  size="4xl"
                >
                  {isConnected && (
                    <>
                      <FontAwesomeIcon icon="file-upload" size="2x" />
                      <Box>{i18n._('Drop file here')}</Box>
                    </>
                  )}
                  {!isConnected && (
                    <>
                      <Box color="error.icon">
                        <FontAwesomeIcon icon="times-circle" size="2x" />
                      </Box>
                      <Box>{i18n._('You cannot upload files to the workspace when the connection is not established.')}</Box>
                    </>
                  )}
                </Text>
              </Flex>
            )}
            {/* The app header is 48px tall — keep in sync with $navbar-height (styles/variables.styl). */}
            <Box height="calc(100vh - 48px)" overflowX="auto">
              <Flex height="calc(100vh - 48px)" minHeight="0">
                <Box
                  flex="0 1 360px"
                  width="360px"
                  minWidth="320px"
                  minHeight="0"
                  display={hidePrimaryContainer ? 'none' : 'flex'}
                  flexDirection="column"
                  position="relative"
                  backgroundColor="background.high"
                  color="text.primary"
                  borderRight="1px solid"
                  borderColor="border.secondary"
                >
                  <Box px="3x" py="3x" flex="none">
                    <Flex align="center" flexWrap="wrap" gap="2x">
                      <Button
                        aria-label={i18n._('Hide left panel')}
                        onClick={togglePrimaryContainer}
                        size="sm"
                      >
                        <FontAwesomeIcon aria-hidden="true" icon="chevron-left" fixedWidth />
                      </Button>
                      <Button
                        aria-label={i18n._('Manage Widgets ({{inactiveCount}})', { inactiveCount })}
                        flex="1"
                        minWidth="0"
                        onClick={updateWidgetsForPrimaryContainer}
                        size="sm"
                      >
                        <FontAwesomeIcon aria-hidden="true" icon="list-alt" />
                        <Space width="2x" />
                        <Box className={styles.panelActionLabel} minWidth="0" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                          {i18n._('Manage Widgets ({{inactiveCount}})', { inactiveCount })}
                        </Box>
                      </Button>
                      <ButtonGroup size="sm">
                        <Button
                          aria-label={i18n._('Collapse all left panel widgets')}
                          title={i18n._('Collapse All')}
                          onClick={() => workspaceLayout.setWidgetsCollapsed(primaryWidgetIds, true)}
                        >
                          <FontAwesomeIcon aria-hidden="true" icon="chevron-up" fixedWidth />
                        </Button>
                        <Button
                          aria-label={i18n._('Expand all left panel widgets')}
                          title={i18n._('Expand All')}
                          onClick={() => workspaceLayout.setWidgetsCollapsed(primaryWidgetIds, false)}
                        >
                          <FontAwesomeIcon aria-hidden="true" icon="chevron-down" fixedWidth />
                        </Button>
                      </ButtonGroup>
                    </Flex>
                  </Box>
                  <Box
                    flex="auto"
                    height="100%"
                    overflowX="auto"
                    overflowY="auto"
                    px="3x"
                  >
                    <PrimaryWidgets
                      onForkWidget={onForkWidget}
                      onRemoveWidget={onRemoveWidget}
                      onDragStart={onDragStart}
                      onDragEnd={onDragEnd}
                    />
                  </Box>
                </Box>
                {hidePrimaryContainer && (
                  <Box
                    flex="none"
                    width="50px"
                    paddingTop="10px"
                    textAlign="center"
                    backgroundColor="background.high"
                    color="text.primary"
                    borderRight="1px solid"
                    borderColor="border.secondary"
                  >
                    <Button
                      aria-label={i18n._('Show left panel')}
                      onClick={togglePrimaryContainer}
                      size="sm"
                    >
                      <FontAwesomeIcon aria-hidden="true" icon="chevron-right" fixedWidth />
                    </Button>
                  </Box>
                )}
                <Box
                  flex="auto"
                  minHeight="0"
                  minWidth="360px"
                  position="relative"
                  overflow="hidden"
                >
                  <DefaultWidgets />
                </Box>
                {hideSecondaryContainer && (
                  <Box
                    flex="none"
                    width="50px"
                    paddingTop="10px"
                    textAlign="center"
                    backgroundColor="background.high"
                    color="text.primary"
                    borderLeft="1px solid"
                    borderColor="border.secondary"
                  >
                    <Button
                      aria-label={i18n._('Show right panel')}
                      onClick={toggleSecondaryContainer}
                      size="sm"
                    >
                      <FontAwesomeIcon aria-hidden="true" icon="chevron-left" fixedWidth />
                    </Button>
                  </Box>
                )}
                <Box
                  flex="0 1 360px"
                  width="360px"
                  minWidth="320px"
                  minHeight="0"
                  display={hideSecondaryContainer ? 'none' : 'flex'}
                  flexDirection="column"
                  position="relative"
                  backgroundColor="background.high"
                  color="text.primary"
                  borderLeft="1px solid"
                  borderColor="border.secondary"
                >
                  <Box px="3x" py="3x" flex="none">
                    <Flex align="center" flexWrap="wrap" gap="2x">
                      <ButtonGroup size="sm">
                        <Button
                          aria-label={i18n._('Collapse all right panel widgets')}
                          title={i18n._('Collapse All')}
                          onClick={() => workspaceLayout.setWidgetsCollapsed(secondaryWidgetIds, true)}
                        >
                          <FontAwesomeIcon aria-hidden="true" icon="chevron-up" fixedWidth />
                        </Button>
                        <Button
                          aria-label={i18n._('Expand all right panel widgets')}
                          title={i18n._('Expand All')}
                          onClick={() => workspaceLayout.setWidgetsCollapsed(secondaryWidgetIds, false)}
                        >
                          <FontAwesomeIcon aria-hidden="true" icon="chevron-down" fixedWidth />
                        </Button>
                      </ButtonGroup>
                      <Button
                        aria-label={i18n._('Manage Widgets ({{inactiveCount}})', { inactiveCount })}
                        flex="1"
                        minWidth="0"
                        onClick={updateWidgetsForSecondaryContainer}
                        size="sm"
                      >
                        <FontAwesomeIcon aria-hidden="true" icon="list-alt" />
                        <Space width="2x" />
                        <Box className={styles.panelActionLabel} minWidth="0" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                          {i18n._('Manage Widgets ({{inactiveCount}})', { inactiveCount })}
                        </Box>
                      </Button>
                      <Button
                        aria-label={i18n._('Hide right panel')}
                        onClick={toggleSecondaryContainer}
                        size="sm"
                      >
                        <FontAwesomeIcon aria-hidden="true" icon="chevron-right" fixedWidth />
                      </Button>
                    </Flex>
                  </Box>
                  <Box
                    flex="auto"
                    height="100%"
                    overflowX="auto"
                    overflowY="auto"
                    px="3x"
                  >
                    <SecondaryWidgets
                      onForkWidget={onForkWidget}
                      onRemoveWidget={onRemoveWidget}
                      onDragStart={onDragStart}
                      onDragEnd={onDragEnd}
                    />
                  </Box>
                </Box>
              </Flex>
            </Box>
          </Box>
        )}
      </Dropzone>
    </Box>
  );
};

const WorkspaceWithLayout = props => {
  const workspaceLayout = useWorkspaceLayout();
  const { ids: primaryIds } = useWidgetGroup('primary');
  const { ids: secondaryIds } = useWidgetGroup('secondary');
  const availableControllers = controller.availableControllers;

  return (
    <Workspace
      {...props}
      workspaceLayout={workspaceLayout}
      primaryWidgetIds={selectVisibleWidgetIds(
        primaryIds,
        availableControllers,
        WIDGET_REGISTRY
      )}
      secondaryWidgetIds={selectVisibleWidgetIds(
        secondaryIds,
        availableControllers,
        WIDGET_REGISTRY
      )}
    />
  );
};

export { Workspace, WorkspaceWithLayout };

export default connect(store => {
  const connectionState = _get(store, 'connection.state');
  const isConnected = (connectionState === CONNECTION_STATE_CONNECTED);

  return {
    isConnected,
  };
})(WorkspaceWithLayout);
