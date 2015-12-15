import _ from 'lodash';
import classNames from 'classnames';
import i18n from 'i18next';
import moment from 'moment';
import pubsub from 'pubsub-js';
import React from 'react';
import update from 'react-addons-update';
import socket from '../../../lib/socket';
import { GCODE_STATUS } from './constants';

let stripComments = (() => {
    let re1 = /^\s+|\s+$/g; // Strip leading and trailing spaces
    let re2 = /\s*[#;].*$/g; // Strip everything after # or ; to the end of the line, including preceding spaces
    return (s) => {
        return s.replace(re1, '').replace(re2, '');
    };
})();

class GCodeStats extends React.Component {
    state = {
        startTime: 0,
        duration: 0,
        dimension: {
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

        { // gcode:dimension
            let token = pubsub.subscribe('gcode:dimension', (msg, dimension) => {
                dimension = _.defaultsDeep(dimension, {
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
                });
                that.setState({ dimension: dimension });
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
    render() {
        let dimension = this.state.dimension;
        let total = this.props.total || 0;
        let executed = this.props.executed || 0;
        let startTime = '–';
        let duration = '–';
        let unit = 'mm';
        let digits = (unit === 'mm') ? 3 : 4; // mm=3, inch=4

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
                                    <th className="axis">Axis</th>
                                    <th>Min</th>
                                    <th>Max</th>
                                    <th>Delta</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="axis">X</td>
                                    <td>{dimension.min.x.toFixed(digits)} {unit}</td>
                                    <td>{dimension.max.x.toFixed(digits)} {unit}</td>
                                    <td>{dimension.delta.x.toFixed(digits)} {unit}</td>
                                </tr>
                                <tr>
                                    <td className="axis">Y</td>
                                    <td>{dimension.min.y.toFixed(digits)} {unit}</td>
                                    <td>{dimension.max.y.toFixed(digits)} {unit}</td>
                                    <td>{dimension.delta.y.toFixed(digits)} {unit}</td>
                                </tr>
                                <tr>
                                    <td className="axis">Z</td>
                                    <td>{dimension.min.z.toFixed(digits)} {unit}</td>
                                    <td>{dimension.max.z.toFixed(digits)} {unit}</td>
                                    <td>{dimension.delta.z.toFixed(digits)} {unit}</td>
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
