import _, { includes } from 'lodash';
import classNames from 'classnames';
import pubsub from 'pubsub-js';
import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import Widget from '../../components/Widget';
import i18n from '../../lib/i18n';
import { in2mm, mm2in } from '../../lib/units';
import controller from '../../lib/controller';
import store from '../../store';
import Axes from './Axes';
import { show as showSettings } from './Settings';
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
    // TinyG2
    TINYG2,
    TINYG2_MACHINE_STATE_READY,
    TINYG2_MACHINE_STATE_STOP,
    TINYG2_MACHINE_STATE_END,
    TINYG2_MACHINE_STATE_RUN,
    // Workflow
    WORKFLOW_STATE_IDLE
} from '../../constants';
import {
    DISTANCE_MIN,
    DISTANCE_MAX,
    DISTANCE_STEP,
    DEFAULT_AXES
} from './constants';
import styles from './index.styl';

const toFixedUnits = (units, val) => {
    val = Number(val) || 0;
    if (units === IMPERIAL_UNITS) {
        val = mm2in(val).toFixed(4);
    }
    if (units === METRIC_UNITS) {
        val = val.toFixed(3);
    }

    return val;
};

const toUnits = (units, val) => {
    val = Number(val) || 0;
    if (units === IMPERIAL_UNITS) {
        val = mm2in(val).toFixed(4) * 1;
    }
    if (units === METRIC_UNITS) {
        val = val.toFixed(3) * 1;
    }

    return val;
};

const normalizeToRange = (n, min, max) => {
    if (n < min) {
        return min;
    }
    if (n > max) {
        return max;
    }
    return n;
};

class AxesWidget extends Component {
    static propTypes = {
        onDelete: PropTypes.func,
        sortable: PropTypes.object
    };
    static defaultProps = {
        onDelete: () => {}
    };

    actions = {
        getJogDistance: () => {
            const { units } = this.state;
            const selectedDistance = store.get('widgets.axes.jog.selectedDistance');
            const customDistance = store.get('widgets.axes.jog.customDistance');
            if (selectedDistance) {
                return Number(selectedDistance) || 0;
            }
            return toUnits(units, customDistance);
        },
        getWorkCoordinateSystem: () => {
            const controllerType = this.state.controller.type;
            const controllerState = this.state.controller.state;
            const defaultWCS = 'G54';

            if (controllerType === GRBL) {
                return _.get(controllerState, 'parserstate.modal.coordinate', defaultWCS);
            }

            if (controllerType === TINYG2) {
                return _.get(controllerState, 'sr.modal.coordinate', defaultWCS);
            }

            return defaultWCS;
        },
        jog: (params = {}) => {
            const s = _.map(params, (value, letter) => ('' + letter.toUpperCase() + value)).join(' ');
            controller.command('gcode', 'G91 G0 ' + s); // relative distance
            controller.command('gcode', 'G90'); // absolute distance
        },
        move: (params = {}) => {
            const s = _.map(params, (value, letter) => ('' + letter.toUpperCase() + value)).join(' ');
            controller.command('gcode', 'G0 ' + s);
        },
        toggleKeypadJogging: () => {
            this.setState({ keypadJogging: !this.state.keypadJogging });
        },
        selectAxis: (axis = '') => {
            this.setState({ selectedAxis: axis });
        },
        selectDistance: (distance = '') => {
            this.setState({ selectedDistance: distance });
        },
        changeCustomDistance: (customDistance) => {
            customDistance = normalizeToRange(customDistance, DISTANCE_MIN, DISTANCE_MAX);
            this.setState({ customDistance: customDistance });
        },
        increaseCustomDistance: () => {
            const { units, customDistance } = this.state;
            let distance = Math.min(Number(customDistance) + DISTANCE_STEP, DISTANCE_MAX);
            if (units === IMPERIAL_UNITS) {
                distance = distance.toFixed(4) * 1;
            }
            if (units === METRIC_UNITS) {
                distance = distance.toFixed(3) * 1;
            }
            this.setState({ customDistance: distance });
        },
        decreaseCustomDistance: () => {
            const { units, customDistance } = this.state;
            let distance = Math.max(Number(customDistance) - DISTANCE_STEP, DISTANCE_MIN);
            if (units === IMPERIAL_UNITS) {
                distance = distance.toFixed(4) * 1;
            }
            if (units === METRIC_UNITS) {
                distance = distance.toFixed(3) * 1;
            }
            this.setState({ customDistance: distance });
        }
    };
    controllerEvents = {
        'Grbl:state': (state) => {
            const { status, parserstate } = { ...state };
            const { mpos, wpos } = status;
            const { modal = {} } = { ...parserstate };
            const units = {
                'G20': IMPERIAL_UNITS,
                'G21': METRIC_UNITS
            }[modal.units] || this.state.units;

            let customDistance = store.get('widgets.axes.jog.customDistance');
            if (units === IMPERIAL_UNITS) {
                customDistance = mm2in(customDistance).toFixed(4) * 1;
            }
            if (units === METRIC_UNITS) {
                customDistance = Number(customDistance).toFixed(3) * 1;
            }

            this.setState({
                units: units,
                controller: {
                    type: GRBL,
                    state: state
                },
                machinePosition: {
                    ...this.state.machinePosition,
                    ...mpos
                },
                workPosition: {
                    ...this.state.workPosition,
                    ...wpos
                },
                customDistance: customDistance
            });
        },
        'Smoothie:state': (state) => {
            const { status, parserstate } = { ...state };
            const { mpos, wpos } = status;
            const { modal = {} } = { ...parserstate };
            const units = {
                'G20': IMPERIAL_UNITS,
                'G21': METRIC_UNITS
            }[modal.units] || this.state.units;

            let customDistance = store.get('widgets.axes.jog.customDistance');
            if (units === IMPERIAL_UNITS) {
                customDistance = mm2in(customDistance).toFixed(4) * 1;
            }
            if (units === METRIC_UNITS) {
                customDistance = Number(customDistance).toFixed(3) * 1;
            }

            this.setState({
                units: units,
                controller: {
                    type: SMOOTHIE,
                    state: state
                },
                machinePosition: {
                    ...this.state.machinePosition,
                    ...mpos
                },
                workPosition: {
                    ...this.state.workPosition,
                    ...wpos
                },
                customDistance: customDistance
            });
        },
        'TinyG2:state': (state) => {
            const { sr } = { ...state };
            const { mpos, wpos, modal = {} } = sr;
            const units = {
                'G20': IMPERIAL_UNITS,
                'G21': METRIC_UNITS
            }[modal.units] || this.state.units;

            let customDistance = store.get('widgets.axes.jog.customDistance');
            if (units === IMPERIAL_UNITS) {
                customDistance = mm2in(customDistance).toFixed(4) * 1;
            }
            if (units === METRIC_UNITS) {
                customDistance = Number(customDistance).toFixed(3) * 1;
            }

            this.setState({
                units: units,
                controller: {
                    type: TINYG2,
                    state: state
                },
                machinePosition: {
                    ...this.state.machinePosition,
                    ...mpos
                },
                workPosition: {
                    ...this.state.workPosition,
                    ...wpos
                },
                customDistance: customDistance
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
        return shallowCompare(this, nextProps, nextState);
    }
    componentDidUpdate(prevProps, prevState) {
        const {
            units,
            minimized,
            axes,
            keypadJogging,
            selectedDistance, // '1', '0.1', '0.01', '0.001', or ''
            customDistance
        } = this.state;

        store.set('widgets.axes.minimized', minimized);
        store.set('widgets.axes.axes', axes);
        store.set('widgets.axes.jog.keypad', keypadJogging);
        store.set('widgets.axes.jog.selectedDistance', selectedDistance);

        // The custom distance will not persist to store while toggling between in and mm
        if ((prevState.customDistance !== customDistance) && (prevState.units === units)) {
            const distance = (units === IMPERIAL_UNITS) ? in2mm(customDistance) : customDistance;
            // Save customDistance in mm
            store.set('widgets.axes.jog.customDistance', Number(distance));
        }
    }
    getDefaultState() {
        return {
            minimized: store.get('widgets.axes.minimized', false),
            isFullscreen: false,
            canClick: true, // Defaults to true
            port: controller.port,
            units: METRIC_UNITS,
            controller: {
                type: controller.type,
                state: controller.state
            },
            workflowState: controller.workflowState,
            axes: store.get('widgets.axes.axes', DEFAULT_AXES),
            machinePosition: { // Machine position
                x: '0.000',
                y: '0.000',
                z: '0.000',
                a: '0.000'
            },
            workPosition: { // Work position
                x: '0.000',
                y: '0.000',
                z: '0.000',
                a: '0.000'
            },
            keypadJogging: store.get('widgets.axes.jog.keypad'),
            selectedAxis: '', // Defaults to empty
            selectedDistance: store.get('widgets.axes.jog.selectedDistance'),
            customDistance: toUnits(METRIC_UNITS, store.get('widgets.axes.jog.customDistance'))
        };
    }
    subscribe() {
        const tokens = [
            pubsub.subscribe('port', (msg, port) => {
                port = port || '';

                if (port) {
                    this.setState({ port: port });
                } else {
                    const defaultState = this.getDefaultState();
                    this.setState({
                        ...defaultState,
                        port: ''
                    });
                }
            }),
            pubsub.subscribe('workflowState', (msg, workflowState) => {
                if (this.state.workflowState !== workflowState) {
                    const { keypadJogging, selectedAxis } = this.state;

                    // Disable keypad jogging and shuttle wheel when the workflow is not in the idle state.
                    // This prevents accidental movement while sending G-code commands.
                    this.setState({
                        keypadJogging: (workflowState === WORKFLOW_STATE_IDLE) ? keypadJogging : false,
                        selectedAxis: (workflowState === WORKFLOW_STATE_IDLE) ? selectedAxis : '',
                        workflowState: workflowState
                    });
                }
            })
        ];
        this.pubsubTokens = this.pubsubTokens.concat(tokens);
    }
    unsubscribe() {
        this.pubsubTokens.forEach((token) => {
            pubsub.unsubscribe(token);
        });
        this.pubsubTokens = [];
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
    canClick() {
        const { port, workflowState } = this.state;
        const controllerType = this.state.controller.type;
        const controllerState = this.state.controller.state;

        if (!port) {
            return false;
        }
        if (workflowState !== WORKFLOW_STATE_IDLE) {
            return false;
        }
        if (!includes([GRBL, SMOOTHIE, TINYG2], controllerType)) {
            return false;
        }
        if (controllerType === GRBL) {
            const activeState = _.get(controllerState, 'status.activeState');
            const states = [
                GRBL_ACTIVE_STATE_IDLE,
                GRBL_ACTIVE_STATE_RUN
            ];
            if (!includes(states, activeState)) {
                return false;
            }
        }
        if (controllerType === SMOOTHIE) {
            const activeState = _.get(controllerState, 'status.activeState');
            const states = [
                SMOOTHIE_ACTIVE_STATE_IDLE,
                SMOOTHIE_ACTIVE_STATE_RUN
            ];
            if (!includes(states, activeState)) {
                return false;
            }
        }
        if (controllerType === TINYG2) {
            const machineState = _.get(controllerState, 'sr.machineState');
            const states = [
                TINYG2_MACHINE_STATE_READY,
                TINYG2_MACHINE_STATE_STOP,
                TINYG2_MACHINE_STATE_END,
                TINYG2_MACHINE_STATE_RUN
            ];
            if (!includes(states, machineState)) {
                return false;
            }
        }

        return true;
    }
    render() {
        const { minimized, isFullscreen } = this.state;
        const { units, machinePosition, workPosition } = this.state;
        const state = {
            ...this.state,
            // Determine if the motion button is clickable
            canClick: this.canClick(),
            // Output machine position with the display units
            machinePosition: _.mapValues(machinePosition, (pos, axis) => {
                return String(toFixedUnits(units, pos));
            }),
            // Output work position with the display units
            workPosition: _.mapValues(workPosition, (pos, axis) => {
                return String(toFixedUnits(units, pos));
            })
        };
        const actions = {
            ...this.actions
        };

        return (
            <Widget fullscreen={isFullscreen}>
                <Widget.Header className={this.props.sortable.handleClassName}>
                    <Widget.Title>{i18n._('Axes')}</Widget.Title>
                    <Widget.Controls className={this.props.sortable.filterClassName}>
                        <Widget.Button
                            title={i18n._('Edit')}
                            onClick={(event) => {
                                showSettings(() => {
                                    // Update axes
                                    const axes = store.get('widgets.axes.axes', DEFAULT_AXES);
                                    this.setState({ axes: axes });
                                });
                            }}
                        >
                            <i className="fa fa-cog" />
                        </Widget.Button>
                        <Widget.Button
                            title={minimized ? i18n._('Open') : i18n._('Close')}
                            onClick={(event, val) => this.setState({ minimized: !minimized })}
                        >
                            <i
                                className={classNames(
                                    'fa',
                                    { 'fa-chevron-up': !minimized },
                                    { 'fa-chevron-down': minimized }
                                )}
                            />
                        </Widget.Button>
                        <Widget.Button
                            title={i18n._('Fullscreen')}
                            onClick={(event, val) => this.setState({ isFullscreen: !isFullscreen })}
                        >
                            <i
                                className={classNames(
                                    'fa',
                                    { 'fa-expand': !isFullscreen },
                                    { 'fa-compress': isFullscreen }
                                )}
                            />
                        </Widget.Button>
                        <Widget.Button
                            title={i18n._('Remove')}
                            onClick={(event) => this.props.onDelete()}
                        >
                            <i className="fa fa-times" />
                        </Widget.Button>
                    </Widget.Controls>
                </Widget.Header>
                <Widget.Content
                    className={classNames(
                        styles['widget-content'],
                        { [styles.hidden]: minimized }
                    )}
                >
                    <Axes
                        state={state}
                        actions={actions}
                    />
                </Widget.Content>
            </Widget>
        );
    }
}

export default AxesWidget;
