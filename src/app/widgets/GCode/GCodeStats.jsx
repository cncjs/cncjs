import moment from 'moment';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import i18n from 'app/lib/i18n';
import {
    METRIC_UNITS
} from 'app/constants';
import styles from './index.styl';

const formatISODateTime = (time) => {
    return time > 0 ? moment.unix(time / 1000).format('YYYY-MM-DD HH:mm:ss') : '–';
};

const formatElapsedTime = (elapsedTime) => {
    if (!elapsedTime || elapsedTime < 0) {
        return '–';
    }
    const d = moment.duration(elapsedTime, 'ms');
    return moment(d._data).format('HH:mm:ss');
};

const formatRemainingTime = (remainingTime) => {
    if (!remainingTime || remainingTime < 0) {
        return '–';
    }
    const d = moment.duration(remainingTime, 'ms');
    return moment(d._data).format('HH:mm:ss');
};

class GCodeStats extends PureComponent {
    static propTypes = {
        state: PropTypes.object
    };

    render() {
        const { state } = this.props;
        const { units, total, sent, received, bbox } = state;
        const displayUnits = (units === METRIC_UNITS) ? i18n._('mm') : i18n._('in');
        const startTime = formatISODateTime(state.startTime);
        const finishTime = formatISODateTime(state.finishTime);
        const elapsedTime = formatElapsedTime(state.elapsedTime);
        const remainingTime = formatRemainingTime(state.remainingTime);

        return (
            <div className={styles['gcode-stats']}>
                <div className="row no-gutters" style={{ marginBottom: 10 }}>
                    <div className="col-xs-12">
                        <table className="table-bordered" data-table="dimension">
                            <thead>
                                <tr>
                                    <th className={styles.axis}>{i18n._('Axis')}</th>
                                    <th>{i18n._('Min')}</th>
                                    <th>{i18n._('Max')}</th>
                                    <th>{i18n._('Dimension')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className={styles.axis}>X</td>
                                    <td>{bbox.min.x} {displayUnits}</td>
                                    <td>{bbox.max.x} {displayUnits}</td>
                                    <td>{bbox.delta.x} {displayUnits}</td>
                                </tr>
                                <tr>
                                    <td className={styles.axis}>Y</td>
                                    <td>{bbox.min.y} {displayUnits}</td>
                                    <td>{bbox.max.y} {displayUnits}</td>
                                    <td>{bbox.delta.y} {displayUnits}</td>
                                </tr>
                                <tr>
                                    <td className={styles.axis}>Z</td>
                                    <td>{bbox.min.z} {displayUnits}</td>
                                    <td>{bbox.max.z} {displayUnits}</td>
                                    <td>{bbox.delta.z} {displayUnits}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="row no-gutters" style={{ marginBottom: 10 }}>
                    <div className="col-xs-6">
                        <div>{i18n._('Sent')}</div>
                        <div>{total > 0 ? `${sent} / ${total}` : '–'}</div>
                    </div>
                    <div className="col-xs-6">
                        <div>{i18n._('Received')}</div>
                        <div>{total > 0 ? `${received} / ${total}` : '–'}</div>
                    </div>
                </div>
                <div className="row no-gutters" style={{ marginBottom: 10 }}>
                    <div className="col-xs-6">
                        <div>{i18n._('Start Time')}</div>
                        <div>{startTime}</div>
                    </div>
                    <div className="col-xs-6">
                        <div>{i18n._('Elapsed Time')}</div>
                        <div>{elapsedTime}</div>
                    </div>
                </div>
                <div className="row no-gutters">
                    <div className="col-xs-6">
                        <div>{i18n._('Finish Time')}</div>
                        <div>{finishTime}</div>
                    </div>
                    <div className="col-xs-6">
                        <div>{i18n._('Remaining Time')}</div>
                        <div>{remainingTime}</div>
                    </div>
                </div>
            </div>
        );
    }
}

export default GCodeStats;
