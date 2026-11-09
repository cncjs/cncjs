import { ensurePositiveNumber } from 'ensure-type';
import ExpressionEvaluator from 'expr-eval';
import includes from 'lodash/includes';
import get from 'lodash/get';
import mapValues from 'lodash/mapValues';
import pubsub from 'pubsub-js';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Alert,
  Button,
  Link,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  useColorMode,
  useTheme,
} from '@tonic-ui/react';
import {
  UPDATE_BOUNDING_BOX,
} from '@app/actions/controller';
import Widget from '@app/components/Widget';
import {
  IMPERIAL_UNITS,
  METRIC_UNITS,
} from '@app/constants';
import {
  GRBL,
  GRBL_MACHINE_STATE_RUN,
  MARLIN,
  SMOOTHIE,
  SMOOTHIE_MACHINE_STATE_RUN,
  TINYG,
  TINYG_MACHINE_STATE_RUN,
} from '@app/constants/controller';
import {
  WORKFLOW_STATE_RUNNING,
  WORKFLOW_STATE_PAUSED,
  WORKFLOW_STATE_IDLE,
} from '@app/constants/workflow';
import controller from '@app/lib/controller';
import i18n from '@app/lib/i18n';
import log from '@app/lib/log';
import portal from '@app/lib/portal';
import * as WebGL from '@app/lib/three/WebGL';
import { in2mm } from '@app/lib/units';
import reduxStore from '@app/store/redux';
import WidgetConfig from '@app/widgets/shared/WidgetConfig';
import WidgetConfigProvider from '@app/widgets/shared/WidgetConfigProvider';
import PrimaryToolbar from './PrimaryToolbar';
import SecondaryToolbar from './SecondaryToolbar';
import WorkflowControl from './WorkflowControl';
import Visualizer from './Visualizer';
import Dashboard from './Dashboard';
import Notifications from './Notifications';
import Loading from './Loading';
import Rendering from './Rendering';
import WatchDirectory from './WatchDirectory';
import { getVisualizerColors } from './GCodeVisualizer';
import useVisualizer from './useVisualizer';
import { isWebGLWarningSuppressed } from './webglWarning';
import {
  CAMERA_MODE_PAN,
  CAMERA_MODE_ROTATE,
  MODAL_WATCH_DIRECTORY,
  NOTIFICATION_PROGRAM_ERROR,
  NOTIFICATION_M0_PROGRAM_PAUSE,
  NOTIFICATION_M1_PROGRAM_PAUSE,
  NOTIFICATION_M2_PROGRAM_END,
  NOTIFICATION_M30_PROGRAM_END,
  NOTIFICATION_M6_TOOL_CHANGE,
  NOTIFICATION_M109_SET_EXTRUDER_TEMPERATURE,
  NOTIFICATION_M190_SET_HEATED_BED_TEMPERATURE,
} from './constants';

const translateExpression = (function() {
  const { Parser } = ExpressionEvaluator;
  const reExpressionContext = new RegExp(/\[[^\]]+\]/g);

  return function (gcode, context = controller.context) {
    if (typeof gcode !== 'string') {
      log.error(`Invalid parameter: gcode=${gcode}`);
      return '';
    }

    const lines = gcode.split('\n');
    context = {
      ...controller.context,
      ...context,
    };

    return lines.map(line => {
      try {
        line = line.replace(reExpressionContext, (match) => {
          const expr = match.slice(1, -1);
          return Parser.evaluate(expr, context);
        });
      } catch (e) {
        // Bypass unknown expression
      }

      return line;
    }).join('\n');
  };
}());

const displayWebGLErrorMessage = () => {
  portal(({ onClose }) => (
    <Modal
      autoFocus
      closeOnEsc={false}
      closeOnInteractOutside={false}
      ensureFocus
      isClosable
      isOpen
      size="xs"
      onClose={onClose}
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          WebGL Error Message
        </ModalHeader>
        <ModalBody>
          <Alert severity="warning">
            {window.WebGLRenderingContext && (
              <Box>
                Your graphics card does not seem to support <Link href="http://khronos.org/webgl/wiki/Getting_a_WebGL_Implementation">WebGL</Link>.
                <br />
                Find out how to get it <Link href="http://get.webgl.org/">here</Link>.
              </Box>
            )}
            {!window.WebGLRenderingContext && (
              <Box>
                Your browser does not seem to support <Link href="http://khronos.org/webgl/wiki/Getting_a_WebGL_Implementation">WebGL</Link>.
                <br />
                Find out how to get it <Link href="http://get.webgl.org/">here</Link>.
              </Box>
            )}
          </Alert>
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>
            {i18n._('OK')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  ));
};

/**
 * @param {{name?: string, isProbeCompensationApplied?: boolean, style?: object}} props
 */
function GCodeName({ name, isProbeCompensationApplied, style, ...props }) {
  if (!name) {
    return null;
  }

  return (
    <Box>
      <Box
        color="text.secondary"
        sx={{
          display: 'inline-block',
          position: 'absolute',
          bottom: 8,
          left: 8,
          fontSize: '1.5rem',
        }}
        style={style}
        {...props}
      >
        {name}
      </Box>
      {isProbeCompensationApplied && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            fontSize: '1.2rem',
            color: 'warning._onOverlay.text',
            fontWeight: 'bold',
            backgroundColor: 'background.highest',
            borderRadius: '3px',
            boxShadow: 'low.main',
          }}
        >
          <Box sx={{ backgroundColor: 'warning._overlay', borderRadius: 'inherit', padding: '4px 8px' }}>
            {i18n._('Probe Compensation Applied')}
          </Box>
        </Box>
      )}
    </Box>
  );
}

const zeroBoundingBox = () => ({
  min: { x: 0, y: 0, z: 0 },
  max: { x: 0, y: 0, z: 0 },
});

const updateControllerBoundingBox = bbox => {
  controller.context = {
    ...controller.context,
    xmin: bbox.min.x,
    xmax: bbox.max.x,
    ymin: bbox.min.y,
    ymax: bbox.max.y,
    zmin: bbox.min.z,
    zmax: bbox.max.z,
  };
};

const clearControllerBoundingBox = () => {
  controller.context = {
    ...controller.context,
    xmin: 0,
    xmax: 0,
    ymin: 0,
    ymax: 0,
    zmin: 0,
    zmax: 0,
  };
};

const getInitialState = config => ({
  connected: !!controller.connection.ident,
  units: METRIC_UNITS,
  controller: {
    type: controller.type,
    settings: controller.settings,
    state: controller.state,
  },
  workflow: {
    state: controller.workflow.state,
  },
  notification: {
    type: '',
    data: '',
  },
  modal: {
    name: '',
    params: {},
  },
  machinePosition: {
    x: '0.000',
    y: '0.000',
    z: '0.000',
  },
  workPosition: {
    x: '0.000',
    y: '0.000',
    z: '0.000',
  },
  gcode: {
    displayName: config.get('gcode.displayName', true),
    loading: false,
    rendering: false,
    ready: false,
    content: '',
    bbox: zeroBoundingBox(),
    name: '',
    size: 0,
    total: 0,
    sent: 0,
    received: 0,
    isProbeCompensationApplied: false,
  },
  disabled: config.get('disabled', false),
  projection: config.get('projection', 'orthographic'),
  objects: {
    limits: {
      visible: config.get('objects.limits.visible', true),
    },
    coordinateSystem: {
      visible: config.get('objects.coordinateSystem.visible', true),
    },
    gridLineNumbers: {
      visible: config.get('objects.gridLineNumbers.visible', true),
    },
    cuttingTool: {
      visible: config.get('objects.cuttingTool.visible', true),
    },
  },
  cameraMode: config.get('cameraMode', CAMERA_MODE_PAN),
  cameraPosition: 'top',
  isAgitated: false,
});

const getIsAgitated = state => {
  const { workflow, disabled, objects, controller: controllerState } = state;
  const controllerType = controllerState.type;
  const currentControllerState = controllerState.state;

  if (workflow.state !== WORKFLOW_STATE_RUNNING || disabled) {
    return false;
  }
  if (!objects.cuttingTool.visible) {
    return false;
  }
  if (!includes([GRBL, MARLIN, SMOOTHIE, TINYG], controllerType)) {
    return false;
  }
  if (controllerType === GRBL) {
    return get(currentControllerState, 'status.machineState') === GRBL_MACHINE_STATE_RUN;
  }
  if (controllerType === MARLIN) {
    return false;
  }
  if (controllerType === SMOOTHIE) {
    return get(currentControllerState, 'status.machineState') === SMOOTHIE_MACHINE_STATE_RUN;
  }
  if (controllerType === TINYG) {
    return get(currentControllerState, 'machineState') === TINYG_MACHINE_STATE_RUN;
  }
  return false;
};

/**
 * @param {{widgetId: string}} props
 */
function VisualizerWidget({ widgetId }) {
  const [colorMode] = useColorMode();
  const theme = useTheme();
  const visualizerColors = useMemo(() => getVisualizerColors(theme), [theme]);
  const config = useMemo(() => new WidgetConfig(widgetId), [widgetId]);
  const [state, setState] = useState(() => getInitialState(config));
  const stateRef = useRef(state);
  const isReadyRef = useRef(false);
  const pendingLoadRef = useRef(null);
  const loadIdRef = useRef(0);
  const engineAvailableRef = useRef(false);

  stateRef.current = state;

  const setCurrentState = useCallback(updater => {
    setState(updater);
  }, []);

  const engineAvailable = WebGL.isWebGLAvailable();
  const capable = {
    view3D: engineAvailable && !state.disabled,
  };
  engineAvailableRef.current = engineAvailable;

  const showLoader = state.gcode.loading || state.gcode.rendering;
  const showVisualizer = capable.view3D && !showLoader;
  const isAgitated = getIsAgitated(state);

  const viewState = {
    colorMode,
    visualizerColors,
    cameraPosition: state.cameraPosition,
    cameraMode: state.cameraMode,
    isAgitated,
    machinePosition: state.machinePosition,
    objects: state.objects,
    projection: state.projection,
    sent: state.gcode.sent,
    show: showVisualizer,
    units: state.units,
    workPosition: state.workPosition,
  };
  const onVisualizerError = useCallback(error => {
    log.error('[Visualizer] Asset loading failed:', error);
  }, []);
  const { actions: visualizerActions, containerRef, isReady } = useVisualizer({
    onError: onVisualizerError,
    viewState,
  });
  isReadyRef.current = isReady;

  const dismissNotification = useCallback(() => {
    setCurrentState(current => ({
      ...current,
      notification: {
        ...current.notification,
        type: '',
        data: '',
      },
    }));
  }, [setCurrentState]);

  const openModal = useCallback((name = '', params = {}) => {
    setCurrentState(current => ({
      ...current,
      modal: { name, params },
    }));
  }, [setCurrentState]);

  const closeModal = useCallback(() => {
    setCurrentState(current => ({
      ...current,
      modal: { name: '', params: {} },
    }));
  }, [setCurrentState]);

  const updateModalParams = useCallback((params = {}) => {
    setCurrentState(current => ({
      ...current,
      modal: {
        ...current.modal,
        params: {
          ...current.modal.params,
          ...params,
        },
      },
    }));
  }, [setCurrentState]);

  const completeLoadWithoutEngine = useCallback((content, isProbeCompensationApplied, error) => {
    setCurrentState(current => ({
      ...current,
      gcode: {
        ...current.gcode,
        loading: false,
        rendering: false,
        ready: true,
        content,
        isProbeCompensationApplied,
        bbox: zeroBoundingBox(),
      },
      notification: error
        ? {
          ...current.notification,
          type: NOTIFICATION_PROGRAM_ERROR,
          data: error.message || i18n._('An unexpected error has occurred.'),
        }
        : current.notification,
    }));
  }, [setCurrentState]);

  const loadReadyDocument = useCallback((document, metadata = {}) => {
    const { name, content } = document;
    try {
      const result = visualizerActions.load({ name, content });
      const bbox = result && result.bbox;
      if (!bbox) {
        completeLoadWithoutEngine(content, !!metadata.isProbeCompensationApplied);
        return;
      }

      updateControllerBoundingBox(bbox);
      reduxStore.dispatch({
        type: UPDATE_BOUNDING_BOX,
        payload: { boundingBox: bbox },
      });
      setCurrentState(current => ({
        ...current,
        gcode: {
          ...current.gcode,
          loading: false,
          rendering: false,
          ready: true,
          content,
          isProbeCompensationApplied: !!metadata.isProbeCompensationApplied,
          bbox,
        },
      }));
    } catch (error) {
      log.error('[Visualizer] G-code loading failed:', error);
      completeLoadWithoutEngine(content, !!metadata.isProbeCompensationApplied, error);
    }
  }, [completeLoadWithoutEngine, setCurrentState, visualizerActions]);

  const loadGCode = useCallback(({ name, content, isProbeCompensationApplied = false }) => {
    const document = {
      id: ++loadIdRef.current,
      name,
      content,
      isProbeCompensationApplied,
    };

    clearControllerBoundingBox();
    setCurrentState(current => ({
      ...current,
      gcode: {
        ...current.gcode,
        loading: false,
        rendering: engineAvailableRef.current,
        ready: !engineAvailableRef.current,
        content,
        isProbeCompensationApplied,
        bbox: zeroBoundingBox(),
      },
    }));

    if (!engineAvailableRef.current) {
      pendingLoadRef.current = null;
      completeLoadWithoutEngine(content, isProbeCompensationApplied);
      return;
    }
    if (!isReadyRef.current) {
      pendingLoadRef.current = document;
      return;
    }
    loadReadyDocument(document, document);
  }, [completeLoadWithoutEngine, loadReadyDocument, setCurrentState]);

  const unloadGCode = useCallback(() => {
    pendingLoadRef.current = null;
    if (isReadyRef.current) {
      visualizerActions.unload();
    }
    clearControllerBoundingBox();
    setCurrentState(current => ({
      ...current,
      gcode: {
        ...current.gcode,
        loading: false,
        rendering: false,
        ready: false,
        content: '',
        isProbeCompensationApplied: false,
        bbox: zeroBoundingBox(),
      },
    }));
  }, [setCurrentState, visualizerActions]);

  useEffect(() => {
    if (!isReady || !pendingLoadRef.current) {
      return;
    }
    const document = pendingLoadRef.current;
    pendingLoadRef.current = null;
    loadReadyDocument(document, document);
  }, [isReady, loadReadyDocument]);

  const loadFile = useCallback((file) => {
    setCurrentState(current => ({
      ...current,
      gcode: {
        ...current.gcode,
        loading: true,
        rendering: false,
        ready: false,
        isProbeCompensationApplied: false,
      },
    }));
    controller.command('watchdir_load', file, (err, data) => {
      if (err) {
        setCurrentState(current => ({
          ...current,
          gcode: {
            ...current.gcode,
            loading: false,
            rendering: false,
            ready: false,
          },
        }));
        log.error(err);
        return;
      }
      log.debug(data);
    });
  }, [setCurrentState]);

  const uploadFile = useCallback((meta) => {
    setCurrentState(current => ({
      ...current,
      gcode: {
        ...current.gcode,
        loading: true,
        rendering: false,
        ready: false,
        isProbeCompensationApplied: false,
      },
    }));
    controller.command('sender_load', meta, {}, (err, data) => {
      if (err) {
        setCurrentState(current => ({
          ...current,
          gcode: {
            ...current.gcode,
            loading: false,
            rendering: false,
            ready: false,
          },
        }));
        log.error(err);
        return;
      }
      log.debug(data);
    });
  }, [setCurrentState]);

  const handleRun = useCallback(() => {
    const { workflow, notification } = stateRef.current;
    console.assert(includes([WORKFLOW_STATE_IDLE, WORKFLOW_STATE_PAUSED], workflow.state));
    if (workflow.state === WORKFLOW_STATE_IDLE) {
      controller.command('sender_start');
      return;
    }
    if (workflow.state === WORKFLOW_STATE_PAUSED) {
      if (notification.type === NOTIFICATION_M6_TOOL_CHANGE) {
        portal(({ onClose }) => (
          <Modal
            autoFocus
            closeOnEsc={false}
            closeOnInteractOutside={false}
            ensureFocus
            isClosable
            isOpen
            size="xs"
            onClose={onClose}
          >
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>{i18n._('Tool Change')}</ModalHeader>
              <ModalBody>{i18n._('Are you sure you want to resume program execution?')}</ModalBody>
              <ModalFooter>
                <Button onClick={onClose}>{i18n._('No')}</Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    controller.command('sender_resume');
                    onClose();
                  }}
                >
                  {i18n._('Yes')}
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        ));
        return;
      }
      controller.command('sender_resume');
    }
  }, []);

  const handlePause = useCallback(() => {
    console.assert(includes([WORKFLOW_STATE_RUNNING], stateRef.current.workflow.state));
    controller.command('sender_pause');
  }, []);

  const handleStop = useCallback(() => {
    console.assert(includes([WORKFLOW_STATE_PAUSED], stateRef.current.workflow.state));
    controller.command('sender_stop', { force: true });
  }, []);

  const handleClose = useCallback(() => {
    console.assert(includes([WORKFLOW_STATE_IDLE], stateRef.current.workflow.state));
    controller.command('sender_unload');
  }, []);

  const setBoundingBox = useCallback(bbox => {
    setCurrentState(current => ({
      ...current,
      gcode: { ...current.gcode, bbox },
    }));
  }, [setCurrentState]);

  const toggle3DView = useCallback(() => {
    if (!WebGL.isWebGLAvailable() && stateRef.current.disabled) {
      if (!isWebGLWarningSuppressed()) {
        displayWebGLErrorMessage();
      }
      return;
    }
    setCurrentState(current => ({ ...current, disabled: !current.disabled }));
  }, [setCurrentState]);

  const toPerspectiveProjection = useCallback(() => {
    setCurrentState(current => ({ ...current, projection: 'perspective' }));
  }, [setCurrentState]);

  const toOrthographicProjection = useCallback(() => {
    setCurrentState(current => ({ ...current, projection: 'orthographic' }));
  }, [setCurrentState]);

  const toggleGCodeFilename = useCallback(() => {
    setCurrentState(current => ({
      ...current,
      gcode: { ...current.gcode, displayName: !current.gcode.displayName },
    }));
  }, [setCurrentState]);

  const toggleLimitsVisibility = useCallback(() => {
    setCurrentState(current => ({
      ...current,
      objects: {
        ...current.objects,
        limits: { ...current.objects.limits, visible: !current.objects.limits.visible },
      },
    }));
  }, [setCurrentState]);

  const toggleCoordinateSystemVisibility = useCallback(() => {
    setCurrentState(current => ({
      ...current,
      objects: {
        ...current.objects,
        coordinateSystem: {
          ...current.objects.coordinateSystem,
          visible: !current.objects.coordinateSystem.visible,
        },
      },
    }));
  }, [setCurrentState]);

  const toggleGridLineNumbersVisibility = useCallback(() => {
    setCurrentState(current => ({
      ...current,
      objects: {
        ...current.objects,
        gridLineNumbers: {
          ...current.objects.gridLineNumbers,
          visible: !current.objects.gridLineNumbers.visible,
        },
      },
    }));
  }, [setCurrentState]);

  const toggleCuttingToolVisibility = useCallback(() => {
    setCurrentState(current => ({
      ...current,
      objects: {
        ...current.objects,
        cuttingTool: {
          ...current.objects.cuttingTool,
          visible: !current.objects.cuttingTool.visible,
        },
      },
    }));
  }, [setCurrentState]);

  const camera = useMemo(() => ({
    toRotateMode: () => setCurrentState(current => ({ ...current, cameraMode: CAMERA_MODE_ROTATE })),
    toPanMode: () => setCurrentState(current => ({ ...current, cameraMode: CAMERA_MODE_PAN })),
    zoomFit: () => visualizerActions.zoomFit(),
    zoomIn: () => visualizerActions.zoomIn(),
    zoomOut: () => visualizerActions.zoomOut(),
    panUp: () => visualizerActions.panUp(),
    panDown: () => visualizerActions.panDown(),
    panLeft: () => visualizerActions.panLeft(),
    panRight: () => visualizerActions.panRight(),
    lookAtCenter: () => visualizerActions.lookAtCenter(),
    toTopView: () => setCurrentState(current => ({ ...current, cameraPosition: 'top' })),
    to3DView: () => setCurrentState(current => ({ ...current, cameraPosition: '3d' })),
    toFrontView: () => setCurrentState(current => ({ ...current, cameraPosition: 'front' })),
    toLeftSideView: () => setCurrentState(current => ({ ...current, cameraPosition: 'left' })),
    toRightSideView: () => setCurrentState(current => ({ ...current, cameraPosition: 'right' })),
  }), [setCurrentState, visualizerActions]);

  const actions = useMemo(() => ({
    dismissNotification,
    openModal,
    closeModal,
    updateModalParams,
    loadFile,
    uploadFile,
    loadGCode,
    unloadGCode,
    handleRun,
    handlePause,
    handleStop,
    handleClose,
    setBoundingBox,
    toggle3DView,
    toPerspectiveProjection,
    toOrthographicProjection,
    toggleGCodeFilename,
    toggleLimitsVisibility,
    toggleCoordinateSystemVisibility,
    toggleGridLineNumbersVisibility,
    toggleCuttingToolVisibility,
    camera,
  }), [
    camera,
    closeModal,
    dismissNotification,
    handleClose,
    handlePause,
    handleRun,
    handleStop,
    loadFile,
    loadGCode,
    openModal,
    setBoundingBox,
    toggle3DView,
    toggleCoordinateSystemVisibility,
    toggleCuttingToolVisibility,
    toggleGCodeFilename,
    toggleGridLineNumbersVisibility,
    toggleLimitsVisibility,
    toOrthographicProjection,
    toPerspectiveProjection,
    unloadGCode,
    updateModalParams,
    uploadFile,
  ]);

  const onConnectionOpen = useCallback(() => {
    setCurrentState(current => ({ ...current, connected: true }));
  }, [setCurrentState]);

  const onConnectionChange = useCallback((connectionState, connected) => {
    if (!connected) {
      unloadGCode();
      setCurrentState({ ...getInitialState(config), connected: false });
      return;
    }
    setCurrentState(current => ({ ...current, connected: true }));
  }, [config, setCurrentState, unloadGCode]);

  const onSenderLoad = useCallback((meta, context) => {
    const { name, content } = meta;
    const modifiedContent = translateExpression(content, context);
    loadGCode({
      name,
      content: modifiedContent,
      isProbeCompensationApplied: stateRef.current.gcode.isProbeCompensationApplied,
    });
  }, [loadGCode]);

  const onSenderUnload = useCallback(() => {
    unloadGCode();
  }, [unloadGCode]);

  const onSenderStatus = useCallback((data) => {
    const { hold, holdReason, name, size, total, sent, received } = data;
    const notification = { type: '', data: '' };
    if (hold) {
      const { err, data: reasonData, msg } = { ...holdReason };
      if (err) {
        notification.type = NOTIFICATION_PROGRAM_ERROR;
        notification.data = msg;
      } else if (reasonData === 'M0') {
        notification.type = NOTIFICATION_M0_PROGRAM_PAUSE;
        notification.data = msg;
      } else if (reasonData === 'M1') {
        notification.type = NOTIFICATION_M1_PROGRAM_PAUSE;
        notification.data = msg;
      } else if (reasonData === 'M2') {
        notification.type = NOTIFICATION_M2_PROGRAM_END;
        notification.data = msg;
      } else if (reasonData === 'M30') {
        notification.type = NOTIFICATION_M30_PROGRAM_END;
        notification.data = msg;
      } else if (reasonData === 'M6') {
        notification.type = NOTIFICATION_M6_TOOL_CHANGE;
        notification.data = msg;
      } else if (reasonData === 'M109') {
        notification.type = NOTIFICATION_M109_SET_EXTRUDER_TEMPERATURE;
        notification.data = msg;
      } else if (reasonData === 'M190') {
        notification.type = NOTIFICATION_M190_SET_HEATED_BED_TEMPERATURE;
        notification.data = msg;
      }
    }
    setCurrentState(current => ({
      ...current,
      gcode: { ...current.gcode, name, size, total, sent, received },
      notification: { ...current.notification, ...notification },
    }));
  }, [setCurrentState]);

  const onWorkflowState = useCallback(workflowState => {
    setCurrentState(current => ({
      ...current,
      workflow: { ...current.workflow, state: workflowState },
    }));
  }, [setCurrentState]);

  const onControllerSettings = useCallback((type, controllerSettings) => {
    setCurrentState(current => ({
      ...current,
      controller: { ...current.controller, type, settings: controllerSettings },
    }));
  }, [setCurrentState]);

  const onControllerState = useCallback((type, controllerState) => {
    if (type === GRBL) {
      const { status, parserstate } = { ...controllerState };
      const { mpos, wpos } = status;
      const { modal = {} } = { ...parserstate };
      const units = { G20: IMPERIAL_UNITS, G21: METRIC_UNITS }[modal.units] || stateRef.current.units;
      const $13 = ensurePositiveNumber(get(controller.settings, 'settings.$13', 0));
      setCurrentState(current => ({
        ...current,
        units,
        controller: { ...current.controller, type, state: controllerState },
        machinePosition: mapValues({ ...current.machinePosition, ...mpos }, val => ($13 > 0 ? in2mm(val) : val)),
        workPosition: mapValues({ ...current.workPosition, ...wpos }, val => ($13 > 0 ? in2mm(val) : val)),
      }));
    }
    if (type === MARLIN) {
      const { pos, modal = {} } = { ...controllerState };
      const units = { G20: IMPERIAL_UNITS, G21: METRIC_UNITS }[modal.units] || stateRef.current.units;
      setCurrentState(current => ({
        ...current,
        units,
        controller: { ...current.controller, type, state: controllerState },
        machinePosition: mapValues({ ...current.machinePosition, ...pos }, val => (units === IMPERIAL_UNITS ? in2mm(val) : val)),
        workPosition: mapValues({ ...current.workPosition, ...pos }, val => (units === IMPERIAL_UNITS ? in2mm(val) : val)),
      }));
    }
    if (type === SMOOTHIE) {
      const { status, parserstate } = { ...controllerState };
      const { mpos, wpos } = status;
      const { modal = {} } = { ...parserstate };
      const units = { G20: IMPERIAL_UNITS, G21: METRIC_UNITS }[modal.units] || stateRef.current.units;
      setCurrentState(current => ({
        ...current,
        units,
        controller: { ...current.controller, type, state: controllerState },
        machinePosition: mapValues({ ...current.machinePosition, ...mpos }, val => (units === IMPERIAL_UNITS ? in2mm(val) : val)),
        workPosition: mapValues({ ...current.workPosition, ...wpos }, val => (units === IMPERIAL_UNITS ? in2mm(val) : val)),
      }));
    }
    if (type === TINYG) {
      const { sr } = { ...controllerState };
      const { mpos, wpos, modal = {} } = { ...sr };
      const units = { G20: IMPERIAL_UNITS, G21: METRIC_UNITS }[modal.units] || stateRef.current.units;
      setCurrentState(current => ({
        ...current,
        units,
        controller: { ...current.controller, type, state: controllerState },
        machinePosition: { ...current.machinePosition, ...mpos },
        workPosition: mapValues({ ...current.workPosition, ...wpos }, val => (units === IMPERIAL_UNITS ? in2mm(val) : val)),
      }));
    }
  }, [setCurrentState]);

  useEffect(() => {
    const listeners = {
      'connection:open': onConnectionOpen,
      'connection:change': onConnectionChange,
      'sender:load': onSenderLoad,
      'sender:unload': onSenderUnload,
      'sender:status': onSenderStatus,
      'workflow:state': onWorkflowState,
      'controller:settings': onControllerSettings,
      'controller:state': onControllerState,
    };
    Object.entries(listeners).forEach(([eventName, listener]) => controller.addListener(eventName, listener));
    return () => {
      Object.entries(listeners).forEach(([eventName, listener]) => controller.removeListener(eventName, listener));
    };
  }, [
    onConnectionChange,
    onConnectionOpen,
    onControllerSettings,
    onControllerState,
    onSenderLoad,
    onSenderStatus,
    onSenderUnload,
    onWorkflowState,
  ]);

  useEffect(() => {
    const token = pubsub.subscribe('gcode:load', (_message, data) => {
      if (data && typeof data === 'object') {
        setCurrentState(current => ({
          ...current,
          gcode: {
            ...current.gcode,
            isProbeCompensationApplied: !!data.isProbeCompensationApplied,
          },
        }));
      }
    });
    return () => pubsub.unsubscribe(token);
  }, [setCurrentState]);

  useEffect(() => {
    if (!WebGL.isWebGLAvailable() && !state.disabled) {
      if (!isWebGLWarningSuppressed()) {
        displayWebGLErrorMessage();
      }
      const timeout = setTimeout(() => {
        setCurrentState(current => ({ ...current, disabled: true }));
      }, 0);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [setCurrentState, state.disabled]);

  useEffect(() => {
    config.set('disabled', state.disabled);
  }, [config, state.disabled]);
  useEffect(() => {
    config.set('projection', state.projection);
  }, [config, state.projection]);
  useEffect(() => {
    config.set('cameraMode', state.cameraMode);
  }, [config, state.cameraMode]);
  useEffect(() => {
    config.set('gcode.displayName', state.gcode.displayName);
  }, [config, state.gcode.displayName]);
  useEffect(() => {
    config.set('objects.limits.visible', state.objects.limits.visible);
  }, [config, state.objects.limits.visible]);
  useEffect(() => {
    config.set('objects.coordinateSystem.visible', state.objects.coordinateSystem.visible);
  }, [config, state.objects.coordinateSystem.visible]);
  useEffect(() => {
    config.set('objects.gridLineNumbers.visible', state.objects.gridLineNumbers.visible);
  }, [config, state.objects.gridLineNumbers.visible]);
  useEffect(() => {
    config.set('objects.cuttingTool.visible', state.objects.cuttingTool.visible);
  }, [config, state.objects.cuttingTool.visible]);

  const stateForRender = { ...state, isAgitated };
  const showDashboard = !capable.view3D && !showLoader;
  const showNotifications = !!state.notification.type;

  return (
    <WidgetConfigProvider widgetId={widgetId}>
      <Widget
        aria-label="3D Visualizer widget"
        borderless
        position="absolute"
        top={0}
        right={0}
        bottom={0}
        left={0}
        display="flex"
        flexDirection="column"
      >
        <Widget.Header flex="none" padding="5px 10px" fixed>
          <PrimaryToolbar state={stateForRender} actions={actions} />
        </Widget.Header>
        <WorkflowControl state={stateForRender} actions={actions} />
        <Widget.Content
          backgroundColor="background.highest"
          style={{
            position: 'relative',
            flex: '1 1 auto',
            minHeight: 0,
          }}
        >
          {state.gcode.loading && <Loading />}
          {state.gcode.rendering && <Rendering />}
          {state.modal.name === MODAL_WATCH_DIRECTORY && (
            <WatchDirectory state={stateForRender} actions={actions} />
          )}
          <Dashboard show={showDashboard} state={stateForRender} />
          {engineAvailable && (
            <Visualizer containerRef={containerRef} show={showVisualizer} />
          )}
          {(showVisualizer && state.gcode.displayName) && (
            <GCodeName
              name={state.gcode.name}
              isProbeCompensationApplied={state.gcode.isProbeCompensationApplied}
            />
          )}
          {showNotifications && (
            <Notifications
              show={showNotifications}
              type={state.notification.type}
              data={state.notification.data}
              onDismiss={actions.dismissNotification}
            />
          )}
        </Widget.Content>
        {showVisualizer && (
          <Widget.Footer flex="none" padding="5px 10px">
            <SecondaryToolbar
              is3DView={capable.view3D && isReady}
              cameraMode={state.cameraMode}
              cameraPosition={state.cameraPosition}
              camera={actions.camera}
            />
          </Widget.Footer>
        )}
      </Widget>
    </WidgetConfigProvider>
  );
}

export default VisualizerWidget;
