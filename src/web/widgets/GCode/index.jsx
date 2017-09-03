import _ from 'lodash';
import classNames from 'classnames';
import pubsub from 'pubsub-js';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Widget from '../../components/Widget';
import controller from '../../lib/controller';
import i18n from '../../lib/i18n';
import { mm2in } from '../../lib/units';
import WidgetConfig from '../WidgetConfig';
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

class GCodeWidget extends PureComponent {
    static propTypes = {
        widgetId: PropTypes.string.isRequired,
        onFork: PropTypes.func.isRequired,
        onRemove: PropTypes.func.isRequired,
        sortable: PropTypes.object
    };

    config = new WidgetConfig(this.props.widgetId);
    state = this.getInitialState();
    actions = {
        collapse: () => {
            this.setState({ minimized: true });
        },
        expand: () => {
            this.setState({ minimized: false });
        },
        toggleFullscreen: () => {
            const { minimized, isFullscreen } = this.state;
            this.setState({
                minimized: isFullscreen ? minimized : false,
                isFullscreen: !isFullscreen
            });
        },
        toggleMinimized: () => {
            const { minimized } = this.state;
            this.setState({ minimized: !minimized });
        }
    };
    controllerEvents = {
        'serialport:open': (options) => {
            const { port } = options;
            this.setState({ port: port });
        },
        'serialport:close': (options) => {
            const initialState = this.getInitialState();
            this.setState({ ...initialState });
        },
        'gcode:unload': () => {
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
        },
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
        'workflow:state': (workflowState) => {
            if (this.state.workflowState !== workflowState) {
                this.setState({ workflowState: workflowState });
            }
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

    componentDidMount() {
        this.subscribe();
        this.addControllerEvents();
    }
    componentWillUnmount() {
        this.removeControllerEvents();
        this.unsubscribe();
    }
    componentDidUpdate(prevProps, prevState) {
        const {
            minimized
        } = this.state;

        this.config.set('minimized', minimized);
    }
    getInitialState() {
        return {
            minimized: this.config.get('minimized', false),
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
    render() {
        const { widgetId } = this.props;
        const { minimized, isFullscreen } = this.state;
        const { units, bbox } = this.state;
        const isForkedWidget = widgetId.match(/\w+:[\w\-]+/);
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
                <Widget.Header>
                    <Widget.Title>
                        <Widget.Sortable className={this.props.sortable.handleClassName}>
                            <i className="fa fa-bars" />
                            <span className="space" />
                        </Widget.Sortable>
                        {isForkedWidget &&
                        <i className="fa fa-code-fork" style={{ marginRight: 5 }} />
                        }
                        {i18n._('G-code')}
                    </Widget.Title>
                    <Widget.Controls className={this.props.sortable.filterClassName}>
                        <Widget.Button
                            disabled={isFullscreen}
                            title={minimized ? i18n._('Expand') : i18n._('Collapse')}
                            onClick={actions.toggleMinimized}
                        >
                            <i
                                className={classNames(
                                    'fa',
                                    { 'fa-chevron-up': !minimized },
                                    { 'fa-chevron-down': minimized }
                                )}
                            />
                        </Widget.Button>
                        <Widget.DropdownButton
                            title={i18n._('More')}
                            toggle={<i className="fa fa-ellipsis-v" />}
                            onSelect={(eventKey) => {
                                if (eventKey === 'fullscreen') {
                                    actions.toggleFullscreen();
                                } else if (eventKey === 'fork') {
                                    this.props.onFork();
                                } else if (eventKey === 'remove') {
                                    this.props.onRemove();
                                }
                            }}
                        >
                            <Widget.DropdownMenuItem eventKey="fullscreen">
                                <i
                                    className={classNames(
                                        'fa',
                                        'fa-fw',
                                        { 'fa-expand': !isFullscreen },
                                        { 'fa-compress': isFullscreen }
                                    )}
                                />
                                <span className="space space-sm" />
                                {!isFullscreen ? i18n._('Enter Full Screen') : i18n._('Exit Full Screen')}
                            </Widget.DropdownMenuItem>
                            <Widget.DropdownMenuItem eventKey="fork">
                                <i className="fa fa-fw fa-code-fork" />
                                <span className="space space-sm" />
                                {i18n._('Fork Widget')}
                            </Widget.DropdownMenuItem>
                            <Widget.DropdownMenuItem eventKey="remove">
                                <i className="fa fa-fw fa-times" />
                                <span className="space space-sm" />
                                {i18n._('Remove Widget')}
                            </Widget.DropdownMenuItem>
                        </Widget.DropdownButton>
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
