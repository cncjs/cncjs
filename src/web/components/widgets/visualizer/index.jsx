import _ from 'lodash';
import pubsub from 'pubsub-js';
import React, { Component } from 'react';
import request from 'superagent';
import Visualizer from './Visualizer';
import controller from '../../../lib/controller';
import i18next from 'i18next'; // FIXME
import i18n from '../../../lib/i18n';
import log from '../../../lib/log';
import store from '../../../store';
import Widget from '../../widget';
import {
    // Grbl
    GRBL,
    GRBL_ACTIVE_STATE_IDLE,
    GRBL_ACTIVE_STATE_RUN,
    GRBL_ACTIVE_STATE_HOLD,
    GRBL_ACTIVE_STATE_DOOR,
    GRBL_ACTIVE_STATE_HOME,
    GRBL_ACTIVE_STATE_ALARM,
    GRBL_ACTIVE_STATE_CHECK,

    // TinyG2
    TINYG2,
    TINYG2_MACHINE_STATE_INIT,
    TINYG2_MACHINE_STATE_READY,
    TINYG2_MACHINE_STATE_ALARM,
    TINYG2_MACHINE_STATE_STOP,
    TINYG2_MACHINE_STATE_END,
    TINYG2_MACHINE_STATE_RUN,
    TINYG2_MACHINE_STATE_HOLD,
    TINYG2_MACHINE_STATE_PROBE,
    TINYG2_MACHINE_STATE_CYCLING,
    TINYG2_MACHINE_STATE_HOMING,
    TINYG2_MACHINE_STATE_JOGGING,
    TINYG2_MACHINE_STATE_SHUTDOWN,

    // Workflow
    WORKFLOW_STATE_RUNNING,
    WORKFLOW_STATE_PAUSED,
    WORKFLOW_STATE_IDLE
} from '../../../constants';
import './index.styl';

const noop = () => {};
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

class VisualizerWidget extends Component {
    controllerEvents = {
        'gcode:statuschange': (data) => {
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
            const { status } = { ...state };
            const { activeState, workPosition } = status;
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
                controller: {
                    type: GRBL,
                    state: state
                },
                workPosition: workPosition
            });
        },
        'TinyG2:state': (state) => {
            const { sr } = { ...state };
            const { machineState, workPosition } = sr;
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
                controller: {
                    type: TINYG2,
                    state: state
                },
                workPosition: workPosition
            });
        }
    };
    pubsubTokens = [];

    constructor() {
        super();
        this.state = this.getDefaultState();
    }
    componentDidMount() {
        this.subscribe();
        this.addControllerEvents();
    }
    componentWillUnmount() {
        this.unsubscribe();
        this.removeControllerEvents();
    }
    shouldComponentUpdate(nextProps, nextState) {
        return !_.isEqual(nextProps, this.props) || !_.isEqual(nextState, this.state);
    }
    componentDidUpdate(prevProps, prevState) {
        if (prevState.renderAnimation !== this.state.renderAnimation) {
            store.set('widgets.visualizer.animation', this.state.renderAnimation);
        }
    }
    getDefaultState() {
        return {
            canClick: true, // Defaults to true
            isAgitated: false, // Defaults to false
            port: controller.port,
            controller: {
                type: controller.type,
                state: controller.state
            },
            workflowState: WORKFLOW_STATE_IDLE, // TODO: controller.workflowState
            workPosition: { // Work position
                x: '0.000',
                y: '0.000',
                z: '0.000'
            },
            gcode: {
                loading: false,
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
            renderAnimation: store.get('widgets.visualizer.animation')
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
                // Start waiting
                startWaiting();

                this.loadGCode(data, () => {
                    // Stop waiting
                    stopWaiting();
                });
            }),
            pubsub.subscribe('gcode:unload', (msg) => {
                this.unloadGCode();
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
    canClick() {
        const { port, gcode } = this.state;

        if (!port) {
            return false;
        }
        if (!gcode.ready) {
            return false;
        }

        return true;
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
    uploadFile(data, { name, size }) {
        const { port } = this.state;

        // Start waiting
        startWaiting();

        this.setState({
            gcode: {
                ...this.state.gcode,
                loading: true,
                ready: false
            }
        });

        request
            .put('/api/gcode')
            .send({
                port: port,
                meta: {
                    name: name,
                    size: size
                },
                gcode: data
            })
            .end((err, res) => {
                if (err || res.err) {
                    // Stop waiting
                    stopWaiting();

                    this.setState({
                        gcode: {
                            ...this.state.gcode,
                            loading: false,
                            ready: false
                        }
                    });
                    log.error('Failed to upload file', err, res);
                    return;
                }

                this.loadGCode(data, () => {
                    // Stop waiting
                    stopWaiting();
                });
            });
    }
    loadGCode(data, callback = noop) {
        const visualizer = this.refs.visualizer;
        visualizer.load(data, ({ bbox }) => {
            pubsub.publish('gcode:bbox', bbox);
            this.setState({
                gcode: {
                    ...this.state.gcode,
                    loading: false,
                    ready: true,
                    bbox: bbox
                }
            });
            callback();
        });
    }
    unloadGCode() {
        const visualizer = this.refs.visualizer;
        visualizer.unload();
        this.setState({
            gcode: {
                ...this.state.gcode,
                loading: false,
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
    }
    handleRun() {
        const { workflowState } = this.state;
        console.assert(_.includes([WORKFLOW_STATE_IDLE, WORKFLOW_STATE_PAUSED], workflowState));

        if (workflowState === WORKFLOW_STATE_IDLE) {
            controller.command('start');
        }
        if (workflowState === WORKFLOW_STATE_PAUSED) {
            controller.command('resume');
        }

        pubsub.publish('workflowState', WORKFLOW_STATE_RUNNING);
    }
    handlePause() {
        const { workflowState } = this.state;
        console.assert(_.includes([WORKFLOW_STATE_RUNNING], workflowState));

        controller.command('pause');

        pubsub.publish('workflowState', WORKFLOW_STATE_PAUSED);
    }
    handleStop() {
        const { workflowState } = this.state;
        console.assert(_.includes([WORKFLOW_STATE_PAUSED], workflowState));

        controller.command('stop');
        controller.command('reset');

        pubsub.publish('workflowState', WORKFLOW_STATE_IDLE);
    }
    handleClose() {
        const { workflowState } = this.state;
        console.assert(_.includes([WORKFLOW_STATE_IDLE], workflowState));

        controller.command('unload');

        pubsub.publish('gcode:unload'); // Unload the G-code
    }
    setBoundingBox(bbox) {
        this.setState({
            gcode: {
                ...this.state.gcode,
                bbox: bbox
            }
        });
    }
    toggleRenderAnimation() {
        this.setState({ renderAnimation: !this.state.renderAnimation });
    }
    getControllerState() {
        const controllerType = this.state.controller.type;
        const controllerState = this.state.controller.state;

        if (controllerType === GRBL) {
            const activeState = _.get(controllerState, 'status.activeState');
            const stateText = {
                [GRBL_ACTIVE_STATE_IDLE]: i18n.t('controller:Grbl.activeState.idle'),
                [GRBL_ACTIVE_STATE_RUN]: i18n.t('controller:Grbl.activeState.run'),
                [GRBL_ACTIVE_STATE_HOLD]: i18n.t('controller:Grbl.activeState.hold'),
                [GRBL_ACTIVE_STATE_DOOR]: i18n.t('controller:Grbl.activeState.door'),
                [GRBL_ACTIVE_STATE_HOME]: i18n.t('controller:Grbl.activeState.home'),
                [GRBL_ACTIVE_STATE_ALARM]: i18n.t('controller:Grbl.activeState.alarm'),
                [GRBL_ACTIVE_STATE_CHECK]: i18n.t('controller:Grbl.activeState.check')
            }[activeState];

            return (
                <div>
                    <div className="controller-type">{controllerType}</div>
                {stateText &&
                    <div className="controller-state">{stateText}</div>
                }
                </div>
            );
        }

        if (controllerType === TINYG2) {
            const machineState = _.get(controllerState, 'sr.machineState');
            const stateText = {
                [TINYG2_MACHINE_STATE_INIT]: i18n.t('controller:TinyG2.machineState.init'),
                [TINYG2_MACHINE_STATE_READY]: i18n.t('controller:TinyG2.machineState.ready'),
                [TINYG2_MACHINE_STATE_ALARM]: i18n.t('controller:TinyG2.machineState.alarm'),
                [TINYG2_MACHINE_STATE_STOP]: i18n.t('controller:TinyG2.machineState.stop'),
                [TINYG2_MACHINE_STATE_END]: i18n.t('controller:TinyG2.machineState.end'),
                [TINYG2_MACHINE_STATE_RUN]: i18n.t('controller:TinyG2.machineState.run'),
                [TINYG2_MACHINE_STATE_HOLD]: i18n.t('controller:TinyG2.machineState.hold'),
                [TINYG2_MACHINE_STATE_PROBE]: i18n.t('controller:TinyG2.machineState.probe'),
                [TINYG2_MACHINE_STATE_CYCLING]: i18n.t('controller:TinyG2.machineState.cycling'),
                [TINYG2_MACHINE_STATE_HOMING]: i18n.t('controller:TinyG2.machineState.homing'),
                [TINYG2_MACHINE_STATE_JOGGING]: i18n.t('controller:TinyG2.machineState.jogging'),
                [TINYG2_MACHINE_STATE_SHUTDOWN]: i18n.t('controller:TinyG2.machineState.shutdown')
            }[machineState];

            return (
                <div>
                    <div className="controller-type">{controllerType}</div>
                {stateText &&
                    <div className="controller-state">{stateText}</div>
                }
                </div>
            );
        }

        return null;
    }
    render() {
        const state = {
            ...this.state,
            canClick: this.canClick(),
            isAgitated: this.isAgitated()
        };
        const actions = {
            uploadFile: ::this.uploadFile,
            loadGCode: ::this.loadGCode,
            unloadGCode: ::this.unloadGCode,
            handleRun: ::this.handleRun,
            handlePause: ::this.handlePause,
            handleStop: ::this.handleStop,
            handleClose: ::this.handleClose,
            setBoundingBox: ::this.setBoundingBox,
            toggleRenderAnimation: ::this.toggleRenderAnimation
        };

        return (
            <div {...this.props} data-ns="widgets/visualizer">
                <Widget borderless={true}>
                    <Widget.Header fixed>
                        <Widget.Title>
                            {this.getControllerState()}
                        </Widget.Title>
                    </Widget.Header>
                    <Widget.Content>
                        <Visualizer
                            ref="visualizer"
                            state={state}
                            actions={actions}
                        />
                    </Widget.Content>
                </Widget>
            </div>
        );
    }
}

export default VisualizerWidget;
