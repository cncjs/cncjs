import chainedFunction from 'chained-function';
import classNames from 'classnames';
import ExpressionEvaluator from 'expr-eval';
import includes from 'lodash/includes';
import get from 'lodash/get';
import mapValues from 'lodash/mapValues';
import pubsub from 'pubsub-js';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Detector from 'three/examples/js/Detector';
import Anchor from '../../components/Anchor';
import { Button } from '../../components/Buttons';
import MessageTemplate from '../../components/MessageTemplate';
import Modal from '../../components/Modal';
import Widget from '../../components/Widget';
import controller from '../../lib/controller';
import i18n from '../../lib/i18n';
import log from '../../lib/log';
import portal from '../../lib/portal';
import { in2mm } from '../../lib/units';
import WidgetConfig from '../WidgetConfig';
import PrimaryToolbar from './PrimaryToolbar';
import SecondaryToolbar from './SecondaryToolbar';
import WorkflowControl from './WorkflowControl';
import Visualizer from './Visualizer';
import Dashboard from './Dashboard';
import Notifications from './Notifications';
import Loading from './Loading';
import Rendering from './Rendering';
import WatchDirectory from './WatchDirectory';
import {
    // Units
    IMPERIAL_UNITS,
    METRIC_UNITS,
    // Controller
    GRBL,
    GRBL_MACHINE_STATE_RUN,
    MARLIN,
    SMOOTHIE,
    SMOOTHIE_MACHINE_STATE_RUN,
    TINYG,
    TINYG_MACHINE_STATE_RUN,
    // Workflow
    WORKFLOW_STATE_RUNNING,
    WORKFLOW_STATE_PAUSED,
    WORKFLOW_STATE_IDLE
} from '../../constants';
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
    NOTIFICATION_M190_SET_HEATED_BED_TEMPERATURE
} from './constants';
import styles from './index.styl';

const translateGCodeWithContext = (function() {
    const { Parser } = ExpressionEvaluator;
    const reExpressionContext = new RegExp(/\[[^\]]+\]/g);

    return function fnTranslateGCodeWithContext(gcode, context = controller.context) {
        if (typeof gcode !== 'string') {
            log.error(`Invalid parameter: gcode=${gcode}`);
            return '';
        }

        const lines = gcode.split('\n');

        // The work position (i.e. posx, posy, posz) are not included in the context
        context = {
            ...controller.context,
            ...context
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
        <Modal size="xs" onClose={onClose}>
            <Modal.Header>
                <Modal.Title>
                    WebGL Error Message
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <MessageTemplate type="warning">
                    {window.WebGLRenderingContext &&
                    <div>
                        Your graphics card does not seem to support <Anchor href="http://khronos.org/webgl/wiki/Getting_a_WebGL_Implementation">WebGL</Anchor>.
                        <br />
                        Find out how to get it <Anchor href="http://get.webgl.org/">here</Anchor>.
                    </div>
                    }
                    {!window.WebGLRenderingContext &&
                    <div>
                        Your browser does not seem to support <Anchor href="http://khronos.org/webgl/wiki/Getting_a_WebGL_Implementation">WebGL</Anchor>.
                        <br />
                        Find out how to get it <Anchor href="http://get.webgl.org/">here</Anchor>.
                    </div>
                    }
                </MessageTemplate>
            </Modal.Body>
            <Modal.Footer>
                <Button
                    onClick={onClose}
                >
                    {i18n._('OK')}
                </Button>
            </Modal.Footer>
        </Modal>
    ));
};

class VisualizerWidget extends PureComponent {
    static propTypes = {
        widgetId: PropTypes.string.isRequired
    };

    config = new WidgetConfig(this.props.widgetId);
    state = this.getInitialState();
    actions = {
        dismissNotification: () => {
            this.setState((state) => ({
                notification: {
                    ...state.notification,
                    type: '',
                    data: ''
                }
            }));
        },
        openModal: (name = '', params = {}) => {
            this.setState((state) => ({
                modal: {
                    name: name,
                    params: params
                }
            }));
        },
        closeModal: () => {
            this.setState((state) => ({
                modal: {
                    name: '',
                    params: {}
                }
            }));
        },
        updateModalParams: (params = {}) => {
            this.setState((state) => ({
                modal: {
                    ...state.modal,
                    params: {
                        ...state.modal.params,
                        ...params
                    }
                }
            }));
        },
        // Load file from watch directory
        loadFile: (file) => {
            this.setState((state) => ({
                gcode: {
                    ...state.gcode,
                    loading: true,
                    rendering: false,
                    ready: false
                }
            }));

            controller.command('watchdir:load', file, (err, data) => {
                if (err) {
                    this.setState((state) => ({
                        gcode: {
                            ...state.gcode,
                            loading: false,
                            rendering: false,
                            ready: false
                        }
                    }));

                    log.error(err);
                    return;
                }

                log.debug(data); // TODO
            });
        },
        uploadFile: (content, meta) => {
            const { name } = { ...meta };
            const context = {};

            this.setState((state) => ({
                gcode: {
                    ...state.gcode,
                    loading: true,
                    rendering: false,
                    ready: false
                }
            }));

            controller.command('sender:load', name, content, context, (err, senderState) => {
                if (err) {
                    this.setState((state) => ({
                        gcode: {
                            ...state.gcode,
                            loading: false,
                            rendering: false,
                            ready: false
                        }
                    }));

                    log.error(err);
                    return;
                }

                log.debug(senderState);
            });
        },
        loadGCode: (name, gcode) => {
            const capable = {
                view3D: !!this.visualizer
            };

            const updater = (state) => ({
                gcode: {
                    ...state.gcode,
                    loading: false,
                    rendering: capable.view3D,
                    ready: !capable.view3D,
                    content: gcode,
                    bbox: {
                        min: {
                            x: 0,
                            y: 0,
                            z: 0
                        },
                        max: {
                            x: 0,
                            y: 0,
                            z: 0
                        }
                    }
                }
            });
            const callback = () => {
                // Clear gcode bounding box
                controller.context = {
                    ...controller.context,
                    xmin: 0,
                    xmax: 0,
                    ymin: 0,
                    ymax: 0,
                    zmin: 0,
                    zmax: 0
                };

                if (!capable.view3D) {
                    return;
                }

                setTimeout(() => {
                    this.visualizer.load(name, gcode, ({ bbox }) => {
                        // Set gcode bounding box
                        controller.context = {
                            ...controller.context,
                            xmin: bbox.min.x,
                            xmax: bbox.max.x,
                            ymin: bbox.min.y,
                            ymax: bbox.max.y,
                            zmin: bbox.min.z,
                            zmax: bbox.max.z
                        };

                        pubsub.publish('gcode:bbox', bbox);

                        this.setState((state) => ({
                            gcode: {
                                ...state.gcode,
                                loading: false,
                                rendering: false,
                                ready: true,
                                bbox: bbox
                            }
                        }));
                    });
                }, 0);
            };

            this.setState(updater, callback);
        },
        unloadGCode: () => {
            const visualizer = this.visualizer;
            if (visualizer) {
                visualizer.unload();
            }

            // Clear gcode bounding box
            controller.context = {
                ...controller.context,
                xmin: 0,
                xmax: 0,
                ymin: 0,
                ymax: 0,
                zmin: 0,
                zmax: 0
            };

            this.setState((state) => ({
                gcode: {
                    ...state.gcode,
                    loading: false,
                    rendering: false,
                    ready: false,
                    content: '',
                    bbox: {
                        min: {
                            x: 0,
                            y: 0,
                            z: 0
                        },
                        max: {
                            x: 0,
                            y: 0,
                            z: 0
                        }
                    }
                }
            }));
        },
        handleRun: () => {
            const { workflow } = this.state;
            console.assert(includes([WORKFLOW_STATE_IDLE, WORKFLOW_STATE_PAUSED], workflow.state));

            if (workflow.state === WORKFLOW_STATE_IDLE) {
                controller.command('sender:start');
                return;
            }

            if (workflow.state === WORKFLOW_STATE_PAUSED) {
                const { notification } = this.state;

                // M6 Tool Change
                if (notification.type === NOTIFICATION_M6_TOOL_CHANGE) {
                    portal(({ onClose }) => (
                        <Modal size="xs" onClose={onClose}>
                            <Modal.Header>
                                <Modal.Title>
                                    {i18n._('Tool Change')}
                                </Modal.Title>
                            </Modal.Header>
                            <Modal.Body>
                                {i18n._('Are you sure you want to resume program execution?')}
                            </Modal.Body>
                            <Modal.Footer>
                                <Button onClick={onClose}>
                                    {i18n._('No')}
                                </Button>
                                <Button
                                    btnStyle="primary"
                                    onClick={chainedFunction(
                                        () => {
                                            controller.command('sender:resume');
                                        },
                                        onClose
                                    )}
                                >
                                    {i18n._('Yes')}
                                </Button>
                            </Modal.Footer>
                        </Modal>
                    ));

                    return;
                }

                controller.command('sender:resume');
            }
        },
        handlePause: () => {
            const { workflow } = this.state;
            console.assert(includes([WORKFLOW_STATE_RUNNING], workflow.state));

            controller.command('sender:pause');
        },
        handleStop: () => {
            const { workflow } = this.state;
            console.assert(includes([WORKFLOW_STATE_PAUSED], workflow.state));

            controller.command('sender:stop', { force: true });
        },
        handleClose: () => {
            const { workflow } = this.state;
            console.assert(includes([WORKFLOW_STATE_IDLE], workflow.state));

            controller.command('sender:unload');
        },
        setBoundingBox: (bbox) => {
            this.setState((state) => ({
                gcode: {
                    ...state.gcode,
                    bbox: bbox
                }
            }));
        },
        toggle3DView: () => {
            if (!Detector.webgl && this.state.disabled) {
                displayWebGLErrorMessage();
                return;
            }

            this.setState((state) => ({
                disabled: !state.disabled
            }));
        },
        toPerspectiveProjection: (projection) => {
            this.setState((state) => ({
                projection: 'perspective'
            }));
        },
        toOrthographicProjection: (projection) => {
            this.setState((state) => ({
                projection: 'orthographic'
            }));
        },
        toggleGCodeFilename: () => {
            this.setState((state) => ({
                gcode: {
                    ...state.gcode,
                    displayName: !state.gcode.displayName
                }
            }));
        },
        toggleCoordinateSystemVisibility: () => {
            this.setState((state) => ({
                objects: {
                    ...state.objects,
                    coordinateSystem: {
                        ...state.objects.coordinateSystem,
                        visible: !state.objects.coordinateSystem.visible
                    }
                }
            }));
        },
        toggleGridLineNumbersVisibility: () => {
            this.setState((state) => ({
                objects: {
                    ...state.objects,
                    gridLineNumbers: {
                        ...state.objects.gridLineNumbers,
                        visible: !state.objects.gridLineNumbers.visible
                    }
                }
            }));
        },
        toggleToolheadVisibility: () => {
            this.setState((state) => ({
                objects: {
                    ...state.objects,
                    toolhead: {
                        ...state.objects.toolhead,
                        visible: !state.objects.toolhead.visible
                    }
                }
            }));
        },
        camera: {
            toRotateMode: () => {
                this.setState((state) => ({
                    cameraMode: CAMERA_MODE_ROTATE
                }));
            },
            toPanMode: () => {
                this.setState((state) => ({
                    cameraMode: CAMERA_MODE_PAN
                }));
            },
            zoomIn: () => {
                if (this.visualizer) {
                    this.visualizer.zoomIn();
                }
            },
            zoomOut: () => {
                if (this.visualizer) {
                    this.visualizer.zoomOut();
                }
            },
            panUp: () => {
                if (this.visualizer) {
                    this.visualizer.panUp();
                }
            },
            panDown: () => {
                if (this.visualizer) {
                    this.visualizer.panDown();
                }
            },
            panLeft: () => {
                if (this.visualizer) {
                    this.visualizer.panLeft();
                }
            },
            panRight: () => {
                if (this.visualizer) {
                    this.visualizer.panRight();
                }
            },
            lookAtCenter: () => {
                if (this.visualizer) {
                    this.visualizer.lookAtCenter();
                }
            }
        }
    };
    controllerEvents = {
        'connection:open': (options) => {
            const { ident } = options;
            this.setState(state => ({
                connection: {
                    ...state.connection,
                    ident: ident
                }
            }));
        },
        'connection:close': (options) => {
            const initialState = this.getInitialState();
            this.setState({ ...initialState });
            this.actions.unloadGCode();
        },
        'sender:load': (data, context) => {
            const { name, content } = data;
            const gcode = translateGCodeWithContext(content, context); // e.g. xmin,xmax,ymin,ymax,zmin,zmax
            this.actions.loadGCode(name, gcode);
        },
        'sender:unload': () => {
            this.actions.unloadGCode();
        },
        'sender:status': (data) => {
            const { hold, holdReason, name, size, total, sent, received } = data;
            const notification = {
                type: '',
                data: ''
            };

            if (hold) {
                const { err, data } = { ...holdReason };

                if (err) {
                    notification.type = NOTIFICATION_PROGRAM_ERROR;
                    notification.data = err;
                } else if (data === 'M0') {
                    // M0 Program Pause
                    notification.type = NOTIFICATION_M0_PROGRAM_PAUSE;
                } else if (data === 'M1') {
                    // M1 Program Pause
                    notification.type = NOTIFICATION_M1_PROGRAM_PAUSE;
                } else if (data === 'M2') {
                    // M2 Program End
                    notification.type = NOTIFICATION_M2_PROGRAM_END;
                } else if (data === 'M30') {
                    // M30 Program End
                    notification.type = NOTIFICATION_M30_PROGRAM_END;
                } else if (data === 'M6') {
                    // M6 Tool Change
                    notification.type = NOTIFICATION_M6_TOOL_CHANGE;
                } else if (data === 'M109') {
                    // M109 Set Extruder Temperature
                    notification.type = NOTIFICATION_M109_SET_EXTRUDER_TEMPERATURE;
                } else if (data === 'M190') {
                    // M190 Set Heated Bed Temperature
                    notification.type = NOTIFICATION_M190_SET_HEATED_BED_TEMPERATURE;
                }
            }

            this.setState(state => ({
                gcode: {
                    ...state.gcode,
                    name,
                    size,
                    total,
                    sent,
                    received
                },
                notification: {
                    ...state.notification,
                    ...notification
                }
            }));
        },
        'workflow:state': (workflowState) => {
            this.setState(state => ({
                workflow: {
                    ...state.workflow,
                    state: workflowState
                }
            }));
        },
        'controller:settings': (type, controllerSettings) => {
            this.setState(state => ({
                controller: {
                    ...state.controller,
                    type: type,
                    settings: controllerSettings
                }
            }));
        },
        'controller:state': (type, controllerState) => {
            // Grbl
            if (type === GRBL) {
                const { wpos, modal = {} } = { ...controllerState };
                const units = {
                    'G20': IMPERIAL_UNITS,
                    'G21': METRIC_UNITS
                }[modal.units] || this.state.units;
                const $13 = Number(get(controller.settings, 'settings.$13', 0)) || 0;

                this.setState(state => ({
                    units: units,
                    wcs: modal.wcs || state.wcs,
                    controller: {
                        ...state.controller,
                        type: type,
                        state: controllerState
                    },
                    // Work position are reported in mm ($13=0) or inches ($13=1)
                    workPosition: mapValues({
                        ...state.workPosition,
                        ...wpos
                    }, val => {
                        return ($13 > 0) ? in2mm(val) : val;
                    })
                }));
            }

            // Marlin
            if (type === MARLIN) {
                const { pos, modal = {} } = { ...controllerState };
                const units = {
                    'G20': IMPERIAL_UNITS,
                    'G21': METRIC_UNITS
                }[modal.units] || this.state.units;

                this.setState(state => ({
                    units: units,
                    controller: {
                        ...state.controller,
                        type: type,
                        state: controllerState
                    },
                    // Work position are reported in current units
                    workPosition: mapValues({
                        ...state.workPosition,
                        ...pos
                    }, (val) => {
                        return (units === IMPERIAL_UNITS) ? in2mm(val) : val;
                    })
                }));
            }

            // Smoothie
            if (type === SMOOTHIE) {
                const { wpos, modal = {} } = { ...controllerState };
                const units = {
                    'G20': IMPERIAL_UNITS,
                    'G21': METRIC_UNITS
                }[modal.units] || this.state.units;

                this.setState(state => ({
                    units: units,
                    wcs: modal.wcs || state.wcs,
                    controller: {
                        ...state.controller,
                        type: type,
                        state: controllerState
                    },
                    // Work position are reported in current units
                    workPosition: mapValues({
                        ...state.workPosition,
                        ...wpos
                    }, (val) => {
                        return (units === IMPERIAL_UNITS) ? in2mm(val) : val;
                    })
                }));
            }

            // TinyG
            if (type === TINYG) {
                const { wpos, modal = {} } = { ...controllerState };
                const units = {
                    'G20': IMPERIAL_UNITS,
                    'G21': METRIC_UNITS
                }[modal.units] || this.state.units;

                this.setState(state => ({
                    units: units,
                    wcs: modal.wcs || state.wcs,
                    controller: {
                        ...state.controller,
                        type: type,
                        state: controllerState
                    },
                    // https://github.com/synthetos/g2/wiki/Status-Reports
                    // Work position are reported in current units, and also apply any offsets.
                    workPosition: mapValues({
                        ...state.workPosition,
                        ...wpos
                    }, (val) => {
                        return (units === IMPERIAL_UNITS) ? in2mm(val) : val;
                    })
                }));
            }
        }
    };
    pubsubTokens = [];

    // refs
    widgetContent = null;
    visualizer = null;

    componentDidMount() {
        this.addControllerEvents();

        if (!Detector.webgl && !this.state.disabled) {
            displayWebGLErrorMessage();

            setTimeout(() => {
                this.setState((state) => ({
                    disabled: true
                }));
            }, 0);
        }
    }
    componentWillUnmount() {
        this.removeControllerEvents();
    }
    componentDidUpdate(prevProps, prevState) {
        if (this.state.disabled !== prevState.disabled) {
            this.config.set('disabled', this.state.disabled);
        }
        if (this.state.projection !== prevState.projection) {
            this.config.set('projection', this.state.projection);
        }
        if (this.state.cameraMode !== prevState.cameraMode) {
            this.config.set('cameraMode', this.state.cameraMode);
        }
        if (this.state.gcode.displayName !== prevState.gcode.displayName) {
            this.config.set('gcode.displayName', this.state.gcode.displayName);
        }
        if (this.state.objects.coordinateSystem.visible !== prevState.objects.coordinateSystem.visible) {
            this.config.set('objects.coordinateSystem.visible', this.state.objects.coordinateSystem.visible);
        }
        if (this.state.objects.gridLineNumbers.visible !== prevState.objects.gridLineNumbers.visible) {
            this.config.set('objects.gridLineNumbers.visible', this.state.objects.gridLineNumbers.visible);
        }
        if (this.state.objects.toolhead.visible !== prevState.objects.toolhead.visible) {
            this.config.set('objects.toolhead.visible', this.state.objects.toolhead.visible);
        }
    }
    getInitialState() {
        return {
            units: METRIC_UNITS,
            wcs: 'G54', // Work Coordinate System (G54 through G59)
            controller: {
                type: controller.type,
                settings: controller.settings,
                state: controller.state
            },
            connection: {
                ident: controller.connection.ident
            },
            workflow: {
                state: controller.workflow.state
            },
            notification: {
                type: '',
                data: ''
            },
            modal: {
                name: '',
                params: {}
            },
            workPosition: { // Work position
                x: '0.000',
                y: '0.000',
                z: '0.000'
            },
            gcode: {
                displayName: this.config.get('gcode.displayName', true),
                loading: false,
                rendering: false,
                ready: false,
                content: '',
                bbox: {
                    min: {
                        x: 0,
                        y: 0,
                        z: 0
                    },
                    max: {
                        x: 0,
                        y: 0,
                        z: 0
                    }
                },
                // Updates by the "sender:status" event
                name: '',
                size: 0,
                total: 0,
                sent: 0,
                received: 0
            },
            disabled: this.config.get('disabled', false),
            projection: this.config.get('projection', 'orthographic'),
            objects: {
                coordinateSystem: {
                    visible: this.config.get('objects.coordinateSystem.visible', true)
                },
                gridLineNumbers: {
                    visible: this.config.get('objects.gridLineNumbers.visible', true)
                },
                toolhead: {
                    visible: this.config.get('objects.toolhead.visible', true)
                }
            },
            cameraMode: this.config.get('cameraMode', CAMERA_MODE_PAN),
            isAgitated: false // Defaults to false
        };
    }
    addControllerEvents() {
        Object.keys(this.controllerEvents).forEach(eventName => {
            const callback = this.controllerEvents[eventName];
            controller.addListener(eventName, callback);
        });
    }
    removeControllerEvents() {
        Object.keys(this.controllerEvents).forEach(eventName => {
            const callback = this.controllerEvents[eventName];
            controller.removeListener(eventName, callback);
        });
    }
    isAgitated() {
        const { workflow, disabled, objects } = this.state;
        const controllerType = this.state.controller.type;
        const controllerState = this.state.controller.state;

        if (workflow.state !== WORKFLOW_STATE_RUNNING) {
            return false;
        }
        // Return false when 3D view is disabled
        if (disabled) {
            return false;
        }
        // Return false when toolhead is not visible
        if (!objects.toolhead.visible) {
            return false;
        }
        if (!includes([GRBL, MARLIN, SMOOTHIE, TINYG], controllerType)) {
            return false;
        }
        if (controllerType === GRBL) {
            const machineState = get(controllerState, 'machineState');
            if (machineState !== GRBL_MACHINE_STATE_RUN) {
                return false;
            }
        }
        if (controllerType === MARLIN) {
            // Marlin does not have machine state
            return false;
        }
        if (controllerType === SMOOTHIE) {
            const machineState = get(controllerState, 'machineState');
            if (machineState !== SMOOTHIE_MACHINE_STATE_RUN) {
                return false;
            }
        }
        if (controllerType === TINYG) {
            const machineState = get(controllerState, 'machineState');
            if (machineState !== TINYG_MACHINE_STATE_RUN) {
                return false;
            }
        }

        return true;
    }
    render() {
        const state = {
            ...this.state,
            isAgitated: this.isAgitated()
        };
        const actions = {
            ...this.actions
        };
        const showLoader = state.gcode.loading || state.gcode.rendering;
        const capable = {
            view3D: Detector.webgl && !state.disabled
        };
        const showDashboard = !capable.view3D && !showLoader;
        const showVisualizer = capable.view3D && !showLoader;
        const showNotifications = showVisualizer && !!state.notification.type;

        return (
            <Widget borderless>
                <Widget.Header className={styles.widgetHeader} fixed>
                    <PrimaryToolbar
                        state={state}
                        actions={actions}
                    />
                </Widget.Header>
                <Widget.Content
                    ref={node => {
                        this.widgetContent = node;
                    }}
                    className={classNames(
                        styles.widgetContent,
                        { [styles.view3D]: capable.view3D }
                    )}
                >
                    {state.gcode.loading &&
                    <Loading />
                    }
                    {state.gcode.rendering &&
                    <Rendering />
                    }
                    {state.modal.name === MODAL_WATCH_DIRECTORY &&
                    <WatchDirectory
                        state={state}
                        actions={actions}
                    />
                    }
                    <WorkflowControl
                        state={state}
                        actions={actions}
                    />
                    <Dashboard
                        show={showDashboard}
                        state={state}
                    />
                    {Detector.webgl &&
                    <Visualizer
                        show={showVisualizer}
                        ref={node => {
                            this.visualizer = node;
                        }}
                        state={state}
                    />
                    }
                    {showNotifications &&
                    <Notifications
                        show={showNotifications}
                        type={state.notification.type}
                        data={state.notification.data}
                        onDismiss={actions.dismissNotification}
                    />
                    }
                </Widget.Content>
                {capable.view3D &&
                <Widget.Footer className={styles.widgetFooter}>
                    <SecondaryToolbar
                        state={state}
                        actions={actions}
                    />
                </Widget.Footer>
                }
            </Widget>
        );
    }
}

export default VisualizerWidget;
