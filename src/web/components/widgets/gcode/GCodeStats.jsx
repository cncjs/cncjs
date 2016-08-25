import _ from 'lodash';
import moment from 'moment';
import React, { Component, PropTypes } from 'react';
import CSSModules from 'react-css-modules';
import i18n from '../../../lib/i18n';
import {
    METRIC_UNITS
} from '../../../constants';
import styles from './index.styl';

@CSSModules(styles)
class GCodeStats extends Component {
    static propTypes = {
        state: PropTypes.object
    };

    shouldComponentUpdate(nextProps, nextState) {
        return !_.isEqual(nextProps, this.props);
    }
    render() {
        const { state } = this.props;
        const { units, total, sent, startTime, duration, bbox } = state;
        const displayUnits = (units === METRIC_UNITS) ? i18n._('mm') : i18n._('in');

        let formattedStartTime = '–';
        if (startTime > 0) {
            formattedStartTime = moment.unix(startTime).format('YYYY-MM-DD HH:mm:ss');
        }

        let formattedDuration = '–';
        if (duration > 0) {
            const d = moment.duration(duration, 'seconds');
            const hours = _.padStart(d.hours(), 2, '0');
            const minutes = _.padStart(d.minutes(), 2, '0');
            const seconds = _.padStart(d.seconds(), 2, '0');

            formattedDuration = (hours + ':' + minutes + ':' + seconds);
        }

        return (
            <div styleName="gcode-stats">
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
                    <div className="col-xs-6">{formattedStartTime}</div>
                    <div className="col-xs-6">{formattedDuration}</div>
                </div>
            </div>
        );
    }
}

export default GCodeStats;
