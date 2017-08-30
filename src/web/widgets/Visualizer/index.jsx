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
import Widget from '../../components/Widget';
import controller from '../../lib/controller';
import modal from '../../lib/modal';
import log from '../../lib/log';
import { in2mm } from '../../lib/units';
import WidgetConfig from '../WidgetConfig';
import PrimaryToolbar from './PrimaryToolbar';
import SecondaryToolbar from './SecondaryToolbar';
import WorkflowControl from './WorkflowControl';
import Visualizer from './Visualizer';
import Dashboard from './Dashboard';
import WatchDirectory from './WatchDirectory';
import Loading from './Loading';
import Rendering from './Rendering';
import {
    // Units
    IMPERIAL_UNITS,
    METRIC_UNITS,
    // Grbl
    GRBL,
    GRBL_ACTIVE_STATE_RUN,
    // Smoothie
    SMOOTHIE,
    SMOOTHIE_ACTIVE_STATE_RUN,
    // TinyG
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
    MODAL_WATCH_DIRECTORY
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
    modal({
        title: 'WebGL Error Message',
        body: (
            <div>
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
            </div>
        )
    });
};

class VisualizerWidget extends PureComponent {
    static propTypes = {
        widgetId: PropTypes.string.isRequired
    };

    config = new WidgetConfig(this.props.widgetId);
    state = this.getInitialState();
    actions = {
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
        uploadFile: (gcode, meta) => {
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

            controller.command('gcode:load', name, gcode, context, (err, data) => {
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
            const { workflowState } = this.state;
            console.assert(includes([WORKFLOW_STATE_IDLE, WORKFLOW_STATE_PAUSED], workflowState));

            if (workflowState === WORKFLOW_STATE_IDLE) {
                controller.command('gcode:start');
            }
            if (workflowState === WORKFLOW_STATE_PAUSED) {
                controller.command('gcode:resume');
            }
        },
        handlePause: () => {
            const { workflowState } = this.state;
            console.assert(includes([WORKFLOW_STATE_RUNNING], workflowState));

            controller.command('gcode:pause');
        },
        handleStop: () => {
            const { workflowState } = this.state;
            console.assert(includes([WORKFLOW_STATE_PAUSED], workflowState));

            controller.command('gcode:stop', { force: true });
        },
        handleClose: () => {
            const { workflowState } = this.state;
            console.assert(includes([WORKFLOW_STATE_IDLE], workflowState));

            controller.command('gcode:unload');

            pubsub.publish('gcode:unload'); // Unload the G-code
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
        'serialport:open': (options) => {
            const { port } = options;
            this.setState((state) => ({ port: port }));
        },
        'serialport:close': (options) => {
            this.actions.unloadGCode();

            const initialState = this.getInitialState();
            this.setState((state) => ({ ...initialState }));
        },
        'gcode:load': (name, gcode, context) => {
            gcode = translateGCodeWithContext(gcode, context); // e.g. xmin,xmax,ymin,ymax,zmin,zmax
            this.actions.loadGCode(name, gcode);
        },
        'gcode:unload': () => {
            this.actions.unloadGCode();
        },
        'sender:status': (data) => {
            const { name, size, total, sent, received } = data;
            this.setState((state) => ({
                gcode: {
                    ...state.gcode,
                    name,
                    size,
                    total,
                    sent,
                    received
                }
            }));
        },
        'workflow:state': (workflowState) => {
            if (this.state.workflowState !== workflowState) {
                this.setState((state) => ({ workflowState: workflowState }));
            }
        },
        'Grbl:state': (controllerState) => {
            const { status, parserstate } = { ...controllerState };
            const { wpos } = status;
            const { modal = {} } = { ...parserstate };
            const units = {
                'G20': IMPERIAL_UNITS,
                'G21': METRIC_UNITS
            }[modal.units] || this.state.units;

            this.setState((state) => ({
                units: units,
                controller: {
                    type: GRBL,
                    state: controllerState
                },
                workPosition: {
                    ...state.workPosition,
                    ...wpos
                }
            }));
        },
        'Smoothie:state': (controllerState) => {
            const { status, parserstate } = { ...controllerState };
            const { wpos } = status;
            const { modal = {} } = { ...parserstate };
            const units = {
                'G20': IMPERIAL_UNITS,
                'G21': METRIC_UNITS
            }[modal.units] || this.state.units;

            // Work position are reported in current units
            const workPosition = mapValues({
                ...this.state.workPosition,
                ...wpos
            }, (val) => {
                return (units === IMPERIAL_UNITS) ? in2mm(val) : val;
            });

            this.setState((state) => ({
                units: units,
                controller: {
                    type: SMOOTHIE,
                    state: controllerState
                },
                workPosition: workPosition
            }));
        },
        'TinyG:state': (controllerState) => {
            const { sr } = { ...controllerState };
            const { wpos, modal = {} } = sr;
            const units = {
                'G20': IMPERIAL_UNITS,
                'G21': METRIC_UNITS
            }[modal.units] || this.state.units;

            // https://github.com/synthetos/g2/wiki/Status-Reports
            // Work position are reported in current units, and also apply any offsets.
            const workPosition = mapValues({
                ...this.state.workPosition,
                ...wpos
            }, (val) => {
                return (units === IMPERIAL_UNITS) ? in2mm(val) : val;
            });

            this.setState((state) => ({
                units: units,
                controller: {
                    type: TINYG,
                    state: controllerState
                },
                workPosition: workPosition
            }));
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
            port: controller.port,
            units: METRIC_UNITS,
            controller: {
                type: controller.type,
                state: controller.state
            },
            modal: {
                name: '',
                params: {}
            },
            workflowState: controller.workflowState,
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
            controller.on(eventName, callback);
        });
    }
    removeControllerEvents() {
        Object.keys(this.controllerEvents).forEach(eventName => {
            const callback = this.controllerEvents[eventName];
            controller.off(eventName, callback);
        });
    }
    isAgitated() {
        const { workflowState, disabled, objects } = this.state;
        const controllerType = this.state.controller.type;
        const controllerState = this.state.controller.state;

        if (workflowState !== WORKFLOW_STATE_RUNNING) {
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
        if (!includes([GRBL, SMOOTHIE, TINYG], controllerType)) {
            return false;
        }
        if (controllerType === GRBL) {
            const activeState = get(controllerState, 'status.activeState');
            if (activeState !== GRBL_ACTIVE_STATE_RUN) {
                return false;
            }
        }
        if (controllerType === SMOOTHIE) {
            const activeState = get(controllerState, 'status.activeState');
            if (activeState !== SMOOTHIE_ACTIVE_STATE_RUN) {
                return false;
            }
        }
        if (controllerType === TINYG) {
            const machineState = get(controllerState, 'sr.machineState');
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
                        show={!capable.view3D && !showLoader}
                        state={state}
                    />
                    {Detector.webgl &&
                    <Visualizer
                        show={capable.view3D && !showLoader}
                        ref={node => {
                            this.visualizer = node;
                        }}
                        state={state}
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
