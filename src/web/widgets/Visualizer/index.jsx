import _ from 'lodash';
import delay from 'delay';
import pubsub from 'pubsub-js';
import React, { Component } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import CSSModules from 'react-css-modules';
import Detector from 'three/examples/js/Detector';
import api from '../../api';
import Anchor from '../../components/Anchor';
import Widget from '../../components/Widget';
import controller from '../../lib/controller';
import modal from '../../lib/modal';
import log from '../../lib/log';
import { in2mm } from '../../lib/units';
import store from '../../store';
import Controls from './Controls';
import Toolbar from './Toolbar';
import Joystick from './Joystick';
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
    GRBL_ACTIVE_STATE_IDLE,
    GRBL_ACTIVE_STATE_RUN,
    // Smoothie
    SMOOTHIE,
    SMOOTHIE_ACTIVE_STATE_IDLE,
    SMOOTHIE_ACTIVE_STATE_RUN,
    // TinyG
    TINYG,
    TINYG_MACHINE_STATE_READY,
    TINYG_MACHINE_STATE_STOP,
    TINYG_MACHINE_STATE_END,
    TINYG_MACHINE_STATE_RUN,
    // Workflow
    WORKFLOW_STATE_RUNNING,
    WORKFLOW_STATE_PAUSED,
    WORKFLOW_STATE_IDLE
} from '../../constants';
import {
    MODAL_WATCH_DIRECTORY
} from './constants';
import styles from './index.styl';

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

@CSSModules(styles, { allowMultiple: true })
class VisualizerWidget extends Component {
    actions = {
        openModal: (name = '', params = {}) => {
            this.setState({
                modal: {
                    name: name,
                    params: params
                }
            });
        },
        closeModal: () => {
            this.setState({
                modal: {
                    name: '',
                    params: {}
                }
            });
        },
        updateModalParams: (params = {}) => {
            this.setState({
                modal: {
                    ...this.state.modal,
                    params: {
                        ...this.state.modal.params,
                        ...params
                    }
                }
            });
        },
        // Load file from watch directory
        loadFile: (file) => {
            this.setState({
                gcode: {
                    ...this.state.gcode,
                    loading: true,
                    rendering: false,
                    ready: false
                }
            });

            controller.command('loadfile', file, (err, data) => {
                if (err) {
                    this.setState({
                        gcode: {
                            ...this.state.gcode,
                            loading: false,
                            rendering: false,
                            ready: false
                        }
                    });

                    log.error(err);
                    return;
                }

                const { name = '', gcode = '' } = { ...data };
                pubsub.publish('gcode:load', { name, gcode });
            });
        },
        uploadFile: (gcode, meta) => {
            const { name } = { ...meta };
            const { port } = this.state;

            this.setState({
                gcode: {
                    ...this.state.gcode,
                    loading: true,
                    rendering: false,
                    ready: false
                }
            });

            api.loadGCode({ port, name, gcode })
                .then((res) => {
                    // This will call loadGCode()
                    pubsub.publish('gcode:load', { name, gcode });
                })
                .catch((res) => {
                    this.setState({
                        gcode: {
                            ...this.state.gcode,
                            loading: false,
                            rendering: false,
                            ready: false
                        }
                    });

                    log.error('Failed to upload G-code file');
                });
        },
        loadGCode: (name, gcode) => {
            const capable = {
                view3D: !!this.visualizer
            };

            const nextState = {
                gcode: {
                    ...this.state.gcode,
                    loading: false,
                    rendering: capable.view3D,
                    ready: !capable.view3D,
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
            };

            this.setState(nextState, () => {
                if (!capable.view3D) {
                    return;
                }

                delay(0).then(() => {
                    this.visualizer.load(name, gcode, ({ bbox }) => {
                        // bounding box
                        pubsub.publish('gcode:bbox', bbox);

                        this.setState({
                            gcode: {
                                ...this.state.gcode,
                                loading: false,
                                rendering: false,
                                ready: true,
                                bbox: bbox
                            }
                        });
                    });
                });
            });
        },
        unloadGCode: () => {
            const visualizer = this.visualizer;
            if (visualizer) {
                visualizer.unload();
            }

            this.setState({
                gcode: {
                    ...this.state.gcode,
                    loading: false,
                    rendering: false,
                    ready: false,
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
        },
        handleRun: () => {
            const { workflowState } = this.state;
            console.assert(_.includes([WORKFLOW_STATE_IDLE, WORKFLOW_STATE_PAUSED], workflowState));

            if (workflowState === WORKFLOW_STATE_IDLE) {
                // All G-code data might be sent to Grbl at once while Grbl is running with
                // character-counting streaming protocol, this will keep workflow in a running
                // state if the controller state is not updated in time.
                this.requestStart = true;

                controller.command('start');
            }
            if (workflowState === WORKFLOW_STATE_PAUSED) {
                controller.command('resume');
            }

            pubsub.publish('workflowState', WORKFLOW_STATE_RUNNING);
        },
        handlePause: () => {
            const { workflowState } = this.state;
            console.assert(_.includes([WORKFLOW_STATE_RUNNING], workflowState));

            controller.command('pause');

            pubsub.publish('workflowState', WORKFLOW_STATE_PAUSED);
        },
        handleStop: () => {
            const { workflowState } = this.state;
            console.assert(_.includes([WORKFLOW_STATE_PAUSED], workflowState));

            controller.command('stop');

            pubsub.publish('workflowState', WORKFLOW_STATE_IDLE);
        },
        handleClose: () => {
            const { workflowState } = this.state;
            console.assert(_.includes([WORKFLOW_STATE_IDLE], workflowState));

            controller.command('unload');

            pubsub.publish('gcode:unload'); // Unload the G-code
        },
        setBoundingBox: (bbox) => {
            this.setState({
                gcode: {
                    ...this.state.gcode,
                    bbox: bbox
                }
            });
        },
        toggle3DView: () => {
            if (!Detector.webgl && this.state.disabled) {
                displayWebGLErrorMessage();
                return;
            }

            this.setState({
                disabled: !this.state.disabled
            });
        },
        toggleGCodeFilename: () => {
            this.setState({
                gcode: {
                    ...this.state.gcode,
                    displayName: !this.state.gcode.displayName
                }
            });
        },
        toggleCoordinateSystemVisibility: () => {
            this.setState({
                objects: {
                    ...this.state.objects,
                    coordinateSystem: {
                        ...this.state.objects.coordinateSystem,
                        visible: !this.state.objects.coordinateSystem.visible
                    }
                }
            });
        },
        toggleToolheadVisibility: () => {
            this.setState({
                objects: {
                    ...this.state.objects,
                    toolhead: {
                        ...this.state.objects.toolhead,
                        visible: !this.state.objects.toolhead.visible
                    }
                }
            });
        },
        joystick: {
            up: () => {
                if (this.visualizer) {
                    this.visualizer.panUp();
                }
            },
            down: () => {
                if (this.visualizer) {
                    this.visualizer.panDown();
                }
            },
            left: () => {
                if (this.visualizer) {
                    this.visualizer.panLeft();
                }
            },
            right: () => {
                if (this.visualizer) {
                    this.visualizer.panRight();
                }
            },
            center: () => {
                if (this.visualizer) {
                    this.visualizer.lookAtCenter();
                }
            }
        }
    };
    controllerEvents = {
        'sender:status': (data) => {
            const { name, size, total, sent, received } = data;
            this.setState({
                gcode: {
                    ...this.state.gcode,
                    name,
                    size,
                    total,
                    sent,
                    received
                }
            });
        },
        'Grbl:state': (state) => {
            const { status, parserstate } = { ...state };
            const { activeState, wpos } = status;
            const { modal = {} } = { ...parserstate };
            const units = {
                'G20': IMPERIAL_UNITS,
                'G21': METRIC_UNITS
            }[modal.units] || this.state.units;
            const { workflowState, gcode } = this.state;
            const { sent, total } = gcode;
            const isControllerIdle = _.includes([
                GRBL_ACTIVE_STATE_IDLE
            ], activeState);

            // Keep workflow in a running state if the controller state is not updated in time
            if (this.requestStart && !isControllerIdle) {
                this.requestStart = false;
            }

            const finishing = (total > 0 && sent >= total) && (workflowState !== WORKFLOW_STATE_IDLE) && isControllerIdle && (this.requestStart === false);
            if (finishing) {
                controller.command('stop');
                pubsub.publish('workflowState', WORKFLOW_STATE_IDLE);
            }

            this.setState({
                units: units,
                controller: {
                    type: GRBL,
                    state: state
                },
                workPosition: {
                    ...this.state.workPosition,
                    ...wpos
                }
            });
        },
        'Smoothie:state': (state) => {
            const { status, parserstate } = { ...state };
            const { activeState, wpos } = status;
            const { modal = {} } = { ...parserstate };
            const units = {
                'G20': IMPERIAL_UNITS,
                'G21': METRIC_UNITS
            }[modal.units] || this.state.units;
            const { workflowState, gcode } = this.state;
            const { sent, total } = gcode;
            const isControllerIdle = _.includes([
                SMOOTHIE_ACTIVE_STATE_IDLE
            ], activeState);

            // Keep workflow in a running state if the controller state is not updated in time
            if (this.requestStart && !isControllerIdle) {
                this.requestStart = false;
            }

            const finishing = (total > 0 && sent >= total) && (workflowState !== WORKFLOW_STATE_IDLE) && isControllerIdle && (this.requestStart === false);
            if (finishing) {
                controller.command('stop');
                pubsub.publish('workflowState', WORKFLOW_STATE_IDLE);
            }

            this.setState({
                units: units,
                controller: {
                    type: SMOOTHIE,
                    state: state
                },
                workPosition: {
                    ...this.state.workPosition,
                    ...wpos
                }
            });
        },
        'TinyG:state': (state) => {
            const { sr } = { ...state };
            const { machineState, wpos, modal = {} } = sr;
            const units = {
                'G20': IMPERIAL_UNITS,
                'G21': METRIC_UNITS
            }[modal.units] || this.state.units;
            const { workflowState, gcode } = this.state;
            const { sent, total } = gcode;
            const isControllerIdle = _.includes([
                TINYG_MACHINE_STATE_READY,
                TINYG_MACHINE_STATE_STOP,
                TINYG_MACHINE_STATE_END
            ], machineState);

            // Keep workflow in a running state if the controller state is not updated in time
            if (this.requestStart && !isControllerIdle) {
                this.requestStart = false;
            }

            const finishing = (total > 0 && sent >= total) && (workflowState !== WORKFLOW_STATE_IDLE) && isControllerIdle && (this.requestStart === false);
            if (finishing) {
                controller.command('stop');
                pubsub.publish('workflowState', WORKFLOW_STATE_IDLE);
            }

            // https://github.com/synthetos/g2/wiki/Status-Reports
            // Work position are reported in current units, and also apply any offsets.
            const workPosition = _.mapValues({
                ...this.state.workPosition,
                ...wpos
            }, (val) => {
                return (units === IMPERIAL_UNITS) ? in2mm(val) : val;
            });

            this.setState({
                units: units,
                controller: {
                    type: TINYG,
                    state: state
                },
                workPosition: workPosition
            });
        }
    };
    pubsubTokens = [];
    requestStart = false;
    visualizer = null;

    constructor() {
        super();
        this.state = this.getDefaultState();
    }
    componentDidMount() {
        this.subscribe();
        this.addControllerEvents();

        if (!Detector.webgl && !this.state.disabled) {
            displayWebGLErrorMessage();

            delay(0).then(() => {
                this.setState({ disabled: true });
            });
        }
    }
    componentWillUnmount() {
        this.unsubscribe();
        this.removeControllerEvents();
    }
    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
    componentDidUpdate(prevProps, prevState) {
        if (this.state.disabled !== prevState.disabled) {
            store.set('widgets.visualizer.disabled', this.state.disabled);
        }
        if (this.state.gcode.displayName !== prevState.gcode.displayName) {
            store.set('widgets.visualizer.gcode.displayName', this.state.gcode.displayName);
        }
        if (this.state.objects.coordinateSystem.visible !== prevState.objects.coordinateSystem.visible) {
            store.set('widgets.visualizer.objects.coordinateSystem.visible', this.state.objects.coordinateSystem.visible);
        }
        if (this.state.objects.toolhead.visible !== prevState.objects.toolhead.visible) {
            store.set('widgets.visualizer.objects.toolhead.visible', this.state.objects.toolhead.visible);
        }
    }
    getDefaultState() {
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
                displayName: store.get('widgets.visualizer.gcode.displayName', true),
                loading: false,
                rendering: false,
                ready: false,
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
            disabled: store.get('widgets.visualizer.disabled', false),
            objects: {
                coordinateSystem: {
                    visible: store.get('widgets.visualizer.objects.coordinateSystem.visible', true)
                },
                toolhead: {
                    visible: store.get('widgets.visualizer.objects.toolhead.visible', true)
                }
            },
            isAgitated: false // Defaults to false
        };
    }
    subscribe() {
        const tokens = [
            pubsub.subscribe('port', (msg, port) => {
                port = port || '';

                if (port) {
                    this.setState({ port: port });
                } else {
                    pubsub.publish('gcode:unload');

                    const defaultState = this.getDefaultState();
                    this.setState({
                        ...defaultState,
                        port: ''
                    });
                }
            }),
            pubsub.subscribe('workflowState', (msg, workflowState) => {
                if (this.state.workflowState !== workflowState) {
                    this.setState({ workflowState: workflowState });
                }
            }),
            pubsub.subscribe('gcode:load', (msg, { name, gcode }) => {
                const actions = this.actions;
                actions.loadGCode(name, gcode);
            }),
            pubsub.subscribe('gcode:unload', (msg) => {
                const actions = this.actions;
                actions.unloadGCode();
            })
        ];
        this.pubsubTokens = this.pubsubTokens.concat(tokens);
    }
    unsubscribe() {
        _.each(this.pubsubTokens, (token) => {
            pubsub.unsubscribe(token);
        });
        this.pubsubTokens = [];
    }
    addControllerEvents() {
        _.each(this.controllerEvents, (callback, eventName) => {
            controller.on(eventName, callback);
        });
    }
    removeControllerEvents() {
        _.each(this.controllerEvents, (callback, eventName) => {
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
        if (controllerType === GRBL) {
            const activeState = _.get(controllerState, 'status.activeState');
            if (activeState !== GRBL_ACTIVE_STATE_RUN) {
                return false;
            }
        }
        if (controllerType === SMOOTHIE) {
            const activeState = _.get(controllerState, 'status.activeState');
            if (activeState !== SMOOTHIE_ACTIVE_STATE_RUN) {
                return false;
            }
        }
        if (controllerType === TINYG) {
            const machineState = _.get(controllerState, 'sr.machineState');
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
            <Widget
                style={{ minWidth: 320 }}
                borderless
            >
                <Widget.Header styleName="widget-header" fixed>
                    <Widget.Title style={{ width: '100%' }}>
                        <Controls
                            state={state}
                            actions={actions}
                        />
                    </Widget.Title>
                </Widget.Header>
                <Widget.Content styleName="widget-content">
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
                    <Toolbar
                        state={state}
                        actions={actions}
                    />
                    <Dashboard
                        show={!capable.view3D && !showLoader}
                        state={state}
                    />
                    <Joystick
                        show={capable.view3D}
                        up={actions.joystick.up}
                        down={actions.joystick.down}
                        left={actions.joystick.left}
                        right={actions.joystick.right}
                        center={actions.joystick.center}
                    />
                    {Detector.webgl &&
                    <Visualizer
                        show={capable.view3D && !showLoader}
                        ref={(c) => {
                            this.visualizer = c;
                        }}
                        state={state}
                    />
                    }
                </Widget.Content>
            </Widget>
        );
    }
}

export default VisualizerWidget;
