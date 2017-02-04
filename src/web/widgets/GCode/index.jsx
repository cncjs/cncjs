import _ from 'lodash';
import classNames from 'classnames';
import pubsub from 'pubsub-js';
import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import Widget from '../../components/Widget';
import controller from '../../lib/controller';
import i18n from '../../lib/i18n';
import { mm2in } from '../../lib/units';
import store from '../../store';
import GCode from './GCode';
import {
    // Units
    IMPERIAL_UNITS,
    METRIC_UNITS
} from '../../constants';
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
            const { total, sent, received, startTime, finishTime, elapsedTime, remainingTime } = data;

            this.setState({
                total,
                sent,
                received,
                startTime,
                finishTime,
                elapsedTime,
                remainingTime
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
    }
    componentWillUnmount() {
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

            // G-code Status (from server)
            total: 0,
            sent: 0,
            received: 0,
            startTime: 0,
            finishTime: 0,
            elapsedTime: 0,
            remainingTime: 0,

            // Bounding box
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
            pubsub.subscribe('gcode:unload', (msg) => {
                this.setState({
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
                this.setState({ workflowState: workflowState });
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
