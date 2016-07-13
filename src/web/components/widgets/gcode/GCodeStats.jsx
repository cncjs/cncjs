import _ from 'lodash';
import moment from 'moment';
import pubsub from 'pubsub-js';
import React, { Component, PropTypes } from 'react';
import i18n from '../../../lib/i18n';
import { mm2in } from '../../../lib/units';
import {
    METRIC_UNITS,
    IMPERIAL_UNITS,
    WORKFLOW_STATE_IDLE,
    WORKFLOW_STATE_RUNNING
} from '../../../constants';

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

class GCodeStats extends Component {
    static propTypes = {
        units: PropTypes.string,
        remain: PropTypes.number,
        sent: PropTypes.number,
        total: PropTypes.number,
        createdTime: PropTypes.number,
        startedTime: PropTypes.number,
        finishedTime: PropTypes.number
    };

    state = {
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
    pubsubTokens = [];

    componentDidMount() {
        this.subscribe();
        this.setTimer();
    }
    componentWillUnmount() {
        this.clearTimer();
        this.unsubscribe();
    }
    shouldComponentUpdate(nextProps, nextState) {
        return !_.isEqual(nextProps, this.props) || !_.isEqual(nextState, this.state);
    }
    subscribe() {
        const tokens = [
            pubsub.subscribe('workflowState', (msg, workflowState) => {
                if (workflowState === WORKFLOW_STATE_RUNNING) {
                    const now = moment().unix();
                    const startTime = this.state.startTime || now; // use startTime or current time
                    const duration = (startTime !== now) ? this.state.duration : 0;
                    this.setState({ startTime, duration });
                    return;
                }

                if (workflowState === WORKFLOW_STATE_IDLE) {
                    this.setState({
                        startTime: 0,
                        duration: 0
                    });
                    return;
                }
            }),
            pubsub.subscribe('gcode:boundingBox', (msg, bbox) => {
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
            }),
            pubsub.subscribe('gcode:unload', (msg) => {
                this.setState({
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
    setTimer() {
        this.timer = setInterval(() => {
            if (this.state.startTime === 0) {
                return;
            }

            const from = moment.unix(this.state.startTime);
            const to = moment();
            const duration = to.diff(from, 'seconds');
            this.setState({ duration });
        }, 1000);
    }
    clearTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    render() {
        const { units, total, sent } = this.props;
        const bbox = _.mapValues(this.state.bbox, (position) => {
            position = _.mapValues(position, (val, axis) => toFixedUnits(units, val));
            return position;
        });
        const displayUnits = (units === METRIC_UNITS) ? i18n._('mm') : i18n._('in');
        let startTime = '–';
        let duration = '–';

        if (this.state.startTime > 0) {
            startTime = moment.unix(this.state.startTime).format('YYYY-MM-DD HH:mm:ss');
        }
        if (this.state.duration > 0) {
            const d = moment.duration(this.state.duration, 'seconds');
            const hours = _.padStart(d.hours(), 2, '0');
            const minutes = _.padStart(d.minutes(), 2, '0');
            const seconds = _.padStart(d.seconds(), 2, '0');

            duration = (hours + ':' + minutes + ':' + seconds);
        }

        return (
            <div className="gcode-stats">
                <div className="row no-gutters">
                    <div className="col-xs-12">
                        <table className="table-bordered" data-table="dimension">
                            <thead>
                                <tr>
                                    <th className="axis nowrap">{i18n._('Axis')}</th>
                                    <th className="nowrap">{i18n._('Min')}</th>
                                    <th className="nowrap">{i18n._('Max')}</th>
                                    <th className="nowrap">{i18n._('Dimension')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="axis">X</td>
                                    <td>{bbox.min.x} {displayUnits}</td>
                                    <td>{bbox.max.x} {displayUnits}</td>
                                    <td>{bbox.delta.x} {displayUnits}</td>
                                </tr>
                                <tr>
                                    <td className="axis">Y</td>
                                    <td>{bbox.min.y} {displayUnits}</td>
                                    <td>{bbox.max.y} {displayUnits}</td>
                                    <td>{bbox.delta.y} {displayUnits}</td>
                                </tr>
                                <tr>
                                    <td className="axis">Z</td>
                                    <td>{bbox.min.z} {displayUnits}</td>
                                    <td>{bbox.max.z} {displayUnits}</td>
                                    <td>{bbox.delta.z} {displayUnits}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="row no-gutters">
                    <div className="col-xs-6">{i18n._('Sent')}</div>
                    <div className="col-xs-6">{i18n._('Total')}</div>
                </div>
                <div className="row no-gutters">
                    <div className="col-xs-6">{sent}</div>
                    <div className="col-xs-6">{total}</div>
                </div>
                <div className="row no-gutters">
                    <div className="col-xs-6">{i18n._('Start Time')}</div>
                    <div className="col-xs-6">{i18n._('Duration')}</div>
                </div>
                <div className="row no-gutters">
                    <div className="col-xs-6">{startTime}</div>
                    <div className="col-xs-6">{duration}</div>
                </div>
            </div>
        );
    }
}

export default GCodeStats;
