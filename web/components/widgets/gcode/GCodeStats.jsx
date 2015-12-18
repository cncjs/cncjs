import _ from 'lodash';
import classNames from 'classnames';
import i18n from 'i18next';
import moment from 'moment';
import pubsub from 'pubsub-js';
import React from 'react';
import update from 'react-addons-update';
import socket from '../../../lib/socket';
import {
    METRIC_UNIT
} from './constants';

class GCodeStats extends React.Component {
    static propTypes = {
        unit: React.PropTypes.string,
        executed: React.PropTypes.number,
        total: React.PropTypes.number
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
        let that = this;

        this.pubsubTokens = [];

        { // gcode:boundingBox
            let token = pubsub.subscribe('gcode:boundingBox', (msg, box) => {
                let dX = box.max.x - box.min.x;
                let dY = box.max.y - box.min.y;
                let dZ = box.max.z - box.min.z;

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

        { // gcode:run
            let token = pubsub.subscribe('gcode:run', (msg) => {
                let now = moment().unix();
                let startTime = that.state.startTime || now; // use startTime or current time
                let duration = (startTime !== now) ? that.state.duration : 0;
                that.setState({
                    startTime: startTime,
                    duration: duration
                });
            });
            this.pubsubTokens.push(token);
        }
        
        { // gcode:stop
            let token = pubsub.subscribe('gcode:stop', (msg) => {
                that.setState({
                    startTime: 0,
                    duration: 0
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
            if (this.state.startTime <= 0) {
                this.setState({ duration: 0 });
                return;
            }

            let from = moment.unix(this.state.startTime);
            let to = moment();
            let duration = to.diff(from, 'seconds');
            this.setState({ duration: duration });
        }, 1000);
    }
    clearTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    toUnitString(val) {
        val = Number(val) || 0;
        if (this.props.unit === METRIC_UNIT) {
            val = (val / 1).toFixed(3);
        } else {
            val = (val / 25.4).toFixed(4);
        }
        return '' + val;
    }
    render() {
        let { unit, total, executed } = this.props;
        let box = _.mapValues(this.state.box, (position) => {
            return _.mapValues(position, (val, axis) => this.toUnitString(val));
        });
        let startTime = '–';
        let duration = '–';

        if (this.state.startTime > 0) {
            startTime = moment.unix(this.state.startTime).format('YYYY-MM-DD HH:mm:ss');
        }
        if (this.state.duration > 0) {
            let d = moment.duration(this.state.duration, 'seconds');
            let hours = _.padLeft(d.hours(), 2, '0');
            let minutes = _.padLeft(d.minutes(), 2, '0');
            let seconds = _.padLeft(d.seconds(), 2, '0');

            duration = hours + ':' + minutes + ':' + seconds;
        }

        return (
            <div className="container-fluid gcode-stats">
                <div className="row">
                    <div className="col-xs-12">
                        <div>{i18n._('Dimension:')}</div>
                    </div>
                </div>
                <div className="row">
                    <div className="col-xs-12">
                        <table className="table-bordered" data-table="dimension">
                            <thead>
                                <tr>
                                    <th className="axis">{i18n._('Axis')}</th>
                                    <th>{i18n._('Min')}</th>
                                    <th>{i18n._('Max')}</th>
                                    <th>{i18n._('Delta')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="axis">X</td>
                                    <td>{box.min.x} {unit}</td>
                                    <td>{box.max.x} {unit}</td>
                                    <td>{box.delta.x} {unit}</td>
                                </tr>
                                <tr>
                                    <td className="axis">Y</td>
                                    <td>{box.min.y} {unit}</td>
                                    <td>{box.max.y} {unit}</td>
                                    <td>{box.delta.y} {unit}</td>
                                </tr>
                                <tr>
                                    <td className="axis">Z</td>
                                    <td>{box.min.z} {unit}</td>
                                    <td>{box.max.z} {unit}</td>
                                    <td>{box.delta.z} {unit}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="row">
                    <div className="col-xs-6">{i18n._('Executed')}</div>
                    <div className="col-xs-6">{i18n._('Total')}</div>
                </div>
                <div className="row">
                    <div className="col-xs-6">{executed}</div>
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
