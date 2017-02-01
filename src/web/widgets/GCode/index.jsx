import _ from 'lodash';
import classNames from 'classnames';
import moment from 'moment';
import pubsub from 'pubsub-js';
import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import update from 'react-addons-update';
import Widget from '../../components/Widget';
import controller from '../../lib/controller';
import i18n from '../../lib/i18n';
import { mm2in } from '../../lib/units';
import store from '../../store';
import GCode from './GCode';
import {
    // Units
    IMPERIAL_UNITS,
    METRIC_UNITS,
    // Workflow
    WORKFLOW_STATE_IDLE
} from '../../constants';
import {
    GCODE_STATUS_NOT_STARTED,
    GCODE_STATUS_COMPLETED
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

class GCodeWidget extends Component {
    static propTypes = {
        onDelete: PropTypes.func,
        sortable: PropTypes.object
    };
    static defaultProps = {
        onDelete: () => {}
    };

    actions = {
    };
    controllerEvents = {
        'sender:status': (data) => {
            const { total, sent, received, createdTime, startedTime, finishedTime } = data;

            let lines = this.state.lines;
            if (lines.length > 0 && total > 0) {
                const from = Math.min(this.state.received, lines.length);
                const to = Math.min(received, lines.length);
                let list = {};

                // Reset obsolete queue items
                for (let i = to; i < from; ++i) {
                    list[i] = {
                        status: {
                            $set: GCODE_STATUS_NOT_STARTED
                        }
                    };
                }

                // Update completed queue items
                for (let i = from; i < to; ++i) {
                    list[i] = {
                        status: {
                            $set: GCODE_STATUS_COMPLETED
                        }
                    };
                }

                lines = update(this.state.lines, list);
            }

            this.setState({
                lines,
                total,
                sent,
                received,
                createdTime,
                startedTime,
                finishedTime
            });
        },
        'Grbl:state': (state) => {
            const { parserstate } = { ...state };
            const { modal = {} } = { ...parserstate };
            const units = {
                'G20': IMPERIAL_UNITS,
                'G21': METRIC_UNITS
            }[modal.units] || this.state.units;

            if (this.state.units !== units) {
                this.setState({ units: units });
            }
        },
        'Smoothie:state': (state) => {
            const { parserstate } = { ...state };
            const { modal = {} } = { ...parserstate };
            const units = {
                'G20': IMPERIAL_UNITS,
                'G21': METRIC_UNITS
            }[modal.units] || this.state.units;

            if (this.state.units !== units) {
                this.setState({ units: units });
            }
        },
        'TinyG:state': (state) => {
            const { sr } = { ...state };
            const { modal = {} } = sr;
            const units = {
                'G20': IMPERIAL_UNITS,
                'G21': METRIC_UNITS
            }[modal.units] || this.state.units;

            if (this.state.units !== units) {
                this.setState({ units: units });
            }
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
        this.setTimer();
    }
    componentWillUnmount() {
        this.clearTimer();
        this.removeControllerEvents();
        this.unsubscribe();
    }
    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
    componentDidUpdate(prevProps, prevState) {
        const {
            minimized
        } = this.state;

        store.set('widgets.gcode.minimized', minimized);
    }
    getDefaultState() {
        return {
            minimized: store.get('widgets.gcode.minimized', false),
            isFullscreen: false,

            port: controller.port,
            units: METRIC_UNITS,
            workflowState: controller.workflowState,
            lines: [], // List of G-code lines

            // G-code Status (from server)
            total: 0,
            sent: 0,
            received: 0,
            createdTime: 0,
            startedTime: 0,
            finishedTime: 0,

            // Stats
            startTime: 0,
            duration: 0,
            bbox: { // bounding box
                min: {
                    x: 0,
                    y: 0,
                    z: 0
                },
                max: {
                    x: 0,
                    y: 0,
                    z: 0
                },
                delta: {
                    x: 0,
                    y: 0,
                    z: 0
                }
            }
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
            pubsub.subscribe('gcode:load', (msg, { name, gcode }) => {
                const lines = gcode.split('\n')
                    .filter(line => (line.trim().length > 0))
                    .map((line, index) => {
                        return {
                            id: index,
                            status: GCODE_STATUS_NOT_STARTED,
                            cmd: line
                        };
                    });

                this.setState({ lines: lines });
            }),
            pubsub.subscribe('gcode:unload', (msg) => {
                this.setState({
                    lines: [],
                    startTime: 0,
                    duration: 0,
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
                        },
                        delta: {
                            x: 0,
                            y: 0,
                            z: 0
                        }
                    }
                });
            }),
            pubsub.subscribe('workflowState', (msg, workflowState) => {
                if (workflowState === WORKFLOW_STATE_IDLE) {
                    this.setState({
                        workflowState: workflowState,
                        startTime: 0,
                        duration: 0
                    });
                } else {
                    const now = moment().unix();
                    const startTime = this.state.startTime || now; // use startTime or current time
                    const duration = (startTime !== now) ? this.state.duration : 0;
                    this.setState({
                        workflowState: workflowState,
                        startTime: startTime,
                        duration: duration
                    });
                }
            }),
            pubsub.subscribe('gcode:bbox', (msg, bbox) => {
                const dX = bbox.max.x - bbox.min.x;
                const dY = bbox.max.y - bbox.min.y;
                const dZ = bbox.max.z - bbox.min.z;

                this.setState({
                    bbox: {
                        min: {
                            x: bbox.min.x,
                            y: bbox.min.y,
                            z: bbox.min.z
                        },
                        max: {
                            x: bbox.max.x,
                            y: bbox.max.y,
                            z: bbox.max.z
                        },
                        delta: {
                            x: dX,
                            y: dY,
                            z: dZ
                        }
                    }
                });
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
    setTimer() {
        this.timer = setInterval(() => {
            if (this.state.startTime === 0) {
                return;
            }

            const from = moment.unix(this.state.startTime);
            const to = moment();
            const duration = to.diff(from, 'seconds');
            this.setState({ duration: duration });
        }, 1000);
    }
    clearTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    render() {
        const { minimized, isFullscreen } = this.state;
        const { units, bbox } = this.state;
        const state = {
            ...this.state,
            bbox: _.mapValues(bbox, (position) => {
                position = _.mapValues(position, (val, axis) => toFixedUnits(units, val));
                return position;
            })
        };
        const actions = {
            ...this.actions
        };

        return (
            <Widget fullscreen={isFullscreen}>
                <Widget.Header className={this.props.sortable.handleClassName}>
                    <Widget.Title>{i18n._('G-code')}</Widget.Title>
                    <Widget.Controls className={this.props.sortable.filterClassName}>
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
                    <GCode
                        state={state}
                        actions={actions}
                    />
                </Widget.Content>
            </Widget>
        );
    }
}

export default GCodeWidget;
