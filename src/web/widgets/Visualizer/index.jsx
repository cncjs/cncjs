import _ from 'lodash';
import pubsub from 'pubsub-js';
import React, { Component } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import CSSModules from 'react-css-modules';
import Detector from 'three/examples/js/Detector';
import api from '../../api';
import Anchor from '../../components/Anchor';
import Widget from '../../components/Widget';
import controller from '../../lib/controller';
import i18n from '../../lib/i18n';
import modal from '../../lib/modal';
import log from '../../lib/log';
import store from '../../store';
import Controls from './Controls';
import Toolbar from './Toolbar';
import Joystick from './Joystick';
import Visualizer from './Visualizer';
import {
    // Units
    IMPERIAL_UNITS,
    METRIC_UNITS,
    // Grbl
    GRBL,
    GRBL_ACTIVE_STATE_IDLE,
    GRBL_ACTIVE_STATE_RUN,
    // TinyG2
    TINYG2,
    TINYG2_MACHINE_STATE_READY,
    TINYG2_MACHINE_STATE_STOP,
    TINYG2_MACHINE_STATE_END,
    TINYG2_MACHINE_STATE_RUN,
    // Workflow
    WORKFLOW_STATE_RUNNING,
    WORKFLOW_STATE_PAUSED,
    WORKFLOW_STATE_IDLE
} from '../../constants';
import styles from './index.styl';

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

@CSSModules(styles, { allowMultiple: true })
class VisualizerWidget extends Component {
    actions = {
        uploadFile: (gcode, meta) => {
            const { name } = { ...meta };
            const { port } = this.state;

            startWaiting();

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
                    stopWaiting();

                    // This will call loadGCode()
                    pubsub.publish('gcode:load', gcode);
                })
                .catch((err) => {
                    stopWaiting();

                    this.setState({
                        gcode: {
                            ...this.state.gcode,
                            loading: false,
                            rendering: false,
                            ready: false
                        }
                    });
                    log.error('Failed to upload G-code file:', err);
                });
        },
        loadGCode: (gcode) => {
            const visualizer = this.visualizer;

            this.setState({
                gcode: {
                    ...this.state.gcode,
                    loading: false,
                    rendering: visualizer,
                    ready: !visualizer,
                    sent: 0,
                    total: 0,
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

            if (visualizer) {
                visualizer.load(gcode, ({ bbox }) => {
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
            }
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
                    sent: 0,
                    total: 0,
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
            controller.command('reset');

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
        toggleRenderAnimation: () => {
            this.setState({ renderAnimation: !this.state.renderAnimation });
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
            const { sent = 0, total = 0 } = data;
            this.setState({
                gcode: {
                    ...this.state.gcode,
                    sent: sent,
                    total: total
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

            if (total > 0 && sent >= total && workflowState !== WORKFLOW_STATE_IDLE) {
                const states = [
                    GRBL_ACTIVE_STATE_IDLE
                ];
                if (_.includes(states, activeState)) {
                    controller.command('stop');
                    pubsub.publish('workflowState', WORKFLOW_STATE_IDLE);
                }
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
        'TinyG2:state': (state) => {
            const { sr } = { ...state };
            const { machineState, wpos, modal = {} } = sr;
            const units = {
                'G20': IMPERIAL_UNITS,
                'G21': METRIC_UNITS
            }[modal.units] || this.state.units;
            const { workflowState, gcode } = this.state;
            const { sent, total } = gcode;

            if (total > 0 && sent >= total && workflowState !== WORKFLOW_STATE_IDLE) {
                const states = [
                    TINYG2_MACHINE_STATE_READY,
                    TINYG2_MACHINE_STATE_STOP,
                    TINYG2_MACHINE_STATE_END
                ];
                if (_.includes(states, machineState)) {
                    controller.command('stop');
                    pubsub.publish('workflowState', WORKFLOW_STATE_IDLE);
                }
            }

            this.setState({
                units: units,
                controller: {
                    type: TINYG2,
                    state: state
                },
                workPosition: {
                    ...this.state.workPosition,
                    ...wpos
                }
            });
        }
    };
    pubsubTokens = [];
    visualizer = null;

    constructor() {
        super();
        this.state = this.getDefaultState();
    }
    componentDidMount() {
        this.subscribe();
        this.addControllerEvents();

        if (!Detector.webgl) {
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
        const {
            renderAnimation
        } = this.state;

        store.set('widgets.visualizer.animation', renderAnimation);
    }
    getDefaultState() {
        return {
            port: controller.port,
            units: METRIC_UNITS,
            controller: {
                type: controller.type,
                state: controller.state
            },
            workflowState: controller.workflowState,
            workPosition: { // Work position
                x: '0.000',
                y: '0.000',
                z: '0.000'
            },
            gcode: {
                loading: false,
                rendering: false,
                ready: false,
                sent: 0,
                total: 0,
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
            },
            renderAnimation: store.get('widgets.visualizer.animation'),
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
            pubsub.subscribe('gcode:load', (msg, data = '') => {
                const actions = this.actions;
                actions.loadGCode(data);
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
        const { workflowState, renderAnimation } = this.state;
        const controllerType = this.state.controller.type;
        const controllerState = this.state.controller.state;

        if (workflowState !== WORKFLOW_STATE_RUNNING) {
            return false;
        }
        if (!renderAnimation) {
            return false;
        }
        if (controllerType === GRBL) {
            const activeState = _.get(controllerState, 'status.activeState');
            if (activeState !== GRBL_ACTIVE_STATE_RUN) {
                return false;
            }
        }
        if (controllerType === TINYG2) {
            const machineState = _.get(controllerState, 'sr.machineState');
            if (machineState !== TINYG2_MACHINE_STATE_RUN) {
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

        return (
            <Widget borderless>
                <Widget.Header styleName="widget-header" fixed>
                    <Widget.Title style={{ width: '100%' }}>
                        <Controls
                            state={state}
                            actions={actions}
                        />
                    </Widget.Title>
                </Widget.Header>
                <Widget.Content styleName="widget-content">
                    <Toolbar
                        state={state}
                        actions={actions}
                    />
                    {Detector.webgl &&
                    <Joystick
                        up={actions.joystick.up}
                        down={actions.joystick.down}
                        left={actions.joystick.left}
                        right={actions.joystick.right}
                        center={actions.joystick.center}
                    />
                    }
                    {Detector.webgl &&
                    <Visualizer
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
