import _ from 'lodash';
import moment from 'moment';
import pubsub from 'pubsub-js';
import React from 'react';
import i18n from '../../../lib/i18n';
import {
    METRIC_UNIT,
    IMPERIAL_UNIT
} from './constants';

const toFixedUnitValue = (unit, val) => {
    val = Number(val) || 0;
    if (unit === METRIC_UNIT) {
        val = (val / 1).toFixed(3);
    }
    if (unit === IMPERIAL_UNIT) {
        val = (val / 25.4).toFixed(4);
    }

    return val;
};

class GCodeStats extends React.Component {
    static propTypes = {
        unit: React.PropTypes.string,
        remain: React.PropTypes.number,
        sent: React.PropTypes.number,
        total: React.PropTypes.number,
        createdTime: React.PropTypes.number,
        startedTime: React.PropTypes.number,
        finishedTime: React.PropTypes.number
    };

    state = {
        startTime: 0,
        duration: 0,
        box: { // bounding box
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

    componentDidMount() {
        this.subscribe();
        this.setTimer();
    }
    componentWillUnmount() {
        this.clearTimer();
        this.unsubscribe();
    }
    subscribe() {
        this.pubsubTokens = [];

        { // gcode:boundingBox
            const token = pubsub.subscribe('gcode:boundingBox', (msg, box) => {
                const dX = box.max.x - box.min.x;
                const dY = box.max.y - box.min.y;
                const dZ = box.max.z - box.min.z;

                this.setState({
                    box: {
                        min: {
                            x: box.min.x,
                            y: box.min.y,
                            z: box.min.z
                        },
                        max: {
                            x: box.max.x,
                            y: box.max.y,
                            z: box.max.z
                        },
                        delta: {
                            x: dX,
                            y: dY,
                            z: dZ
                        }
                    }
                });
            });
            this.pubsubTokens.push(token);
        }

        { // gcode:start
            const token = pubsub.subscribe('gcode:start', (msg) => {
                const now = moment().unix();
                const startTime = this.state.startTime || now; // use startTime or current time
                const duration = (startTime !== now) ? this.state.duration : 0;
                this.setState({ startTime, duration });
            });
            this.pubsubTokens.push(token);
        }

        { // gcode:stop
            const token = pubsub.subscribe('gcode:stop', (msg) => {
                this.setState({
                    startTime: 0,
                    duration: 0
                });
            });
            this.pubsubTokens.push(token);
        }

        { // gcode:unload
            const token = pubsub.subscribe('gcode:unload', (msg) => {
                this.setState({
                    startTime: 0,
                    duration: 0,
                    box: {
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
            });
            this.pubsubTokens.push(token);
        }
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
        const { unit, total, sent } = this.props;
        const box = _.mapValues(this.state.box, (position) => {
            const obj = _.mapValues(position, (val, axis) => toFixedUnitValue(unit, val));
            return obj;
        });
        const displayUnit = (unit === METRIC_UNIT) ? i18n._('mm') : i18n._('in');
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
            <div className="container-fluid gcode-stats">
                <div className="row">
                    <div className="col-xs-12">
                        <table className="table-bordered" data-table="dimension">
                            <thead>
                                <tr>
                                    <th className="axis">{i18n._('Axis')}</th>
                                    <th>{i18n._('Min')}</th>
                                    <th>{i18n._('Max')}</th>
                                    <th>{i18n._('Dimension')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="axis">X</td>
                                    <td>{box.min.x} {displayUnit}</td>
                                    <td>{box.max.x} {displayUnit}</td>
                                    <td>{box.delta.x} {displayUnit}</td>
                                </tr>
                                <tr>
                                    <td className="axis">Y</td>
                                    <td>{box.min.y} {displayUnit}</td>
                                    <td>{box.max.y} {displayUnit}</td>
                                    <td>{box.delta.y} {displayUnit}</td>
                                </tr>
                                <tr>
                                    <td className="axis">Z</td>
                                    <td>{box.min.z} {displayUnit}</td>
                                    <td>{box.max.z} {displayUnit}</td>
                                    <td>{box.delta.z} {displayUnit}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="row">
                    <div className="col-xs-6">{i18n._('Sent')}</div>
                    <div className="col-xs-6">{i18n._('Total')}</div>
                </div>
                <div className="row">
                    <div className="col-xs-6">{sent}</div>
                    <div className="col-xs-6">{total}</div>
                </div>
                <div className="row">
                    <div className="col-xs-6">{i18n._('Start Time')}</div>
                    <div className="col-xs-6">{i18n._('Duration')}</div>
                </div>
                <div className="row">
                    <div className="col-xs-6">{startTime}</div>
                    <div className="col-xs-6">{duration}</div>
                </div>
            </div>
        );
    }
}

export default GCodeStats;
