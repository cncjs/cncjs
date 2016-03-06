import _ from 'lodash';
import classNames from 'classnames';
import i18n from '../../../lib/i18n';
import React from 'react';
import store from '../../../store';
import combokeys from '../../../lib/combokeys';
import { in2mm, mm2in } from '../../../lib/units';
import PressAndHold from '../../common/PressAndHold';
import {
    METRIC_UNIT,
    IMPERIAL_UNIT,
    DISTANCE_MIN,
    DISTANCE_MAX,
    DISTANCE_STEP
} from './constants';

class JogDistance extends React.Component {
    static propTypes = {
        unit: React.PropTypes.string
    };
    state = {
        selectedDistance: store.get('widgets.axes.jog.selectedDistance'),
        customDistance: this.toUnitValue(this.props.unit, store.get('widgets.axes.jog.customDistance'))
    };
    unitDidChange = false;
    actionHandlers = {
        JOG_LEVER_SWITCH: () => {
            const { selectedDistance } = this.state;
            const distances = ['1', '0.1', '0.01', '0.001', ''];
            const currentIndex = distances.indexOf(selectedDistance);
            const distance = distances[(currentIndex + 1) % distances.length];
            this.setState({ selectedDistance: distance });
        }
    };

    componentDidMount() {
        _.each(this.actionHandlers, (callback, eventName) => {
            combokeys.on(eventName, callback);
        });
    }
    componentWillUnmount() {
        _.each(this.actionHandlers, (callback, eventName) => {
            combokeys.removeListener(eventName, callback);
        });
    }
    componentWillReceiveProps(nextProps) {
        if (nextProps.unit !== this.props.unit) {
            // Set `this.unitDidChange` to true if the unit has changed
            this.unitDidChange = true;

            let customDistance = store.get('widgets.axes.jog.customDistance');

            if (nextProps.unit === IMPERIAL_UNIT) {
                customDistance = mm2in(customDistance).toFixed(4) * 1;
            }
            if (nextProps.unit === METRIC_UNIT) {
                customDistance = Number(customDistance).toFixed(3) * 1;
            }

            this.setState({ customDistance });
        }
    }
    componentDidUpdate(prevProps, prevState) {
        // Do not save to store if the unit did change between in and mm
        if (this.unitDidChange) {
            this.unitDidChange = false;
            return;
        }

        const { unit } = this.props;
        const { selectedDistance } = this.state;
        let { customDistance = 0 } = this.state;

        if (unit === IMPERIAL_UNIT) {
            customDistance = in2mm(customDistance);
        }

        // '1', '0.1', '0.01', '0.001' or ''
        store.set('widgets.axes.jog.selectedDistance', selectedDistance);

        // To save in mm
        store.set('widgets.axes.jog.customDistance', Number(customDistance));
    }
    normalizeToRange(n, min, max) {
        if (n < min) {
            return min;
        }
        if (n > max) {
            return max;
        }
        return n;
    }
    changeSelectedDistance(value = '') {
        this.setState({ selectedDistance: value });
    }
    handleChangeCustomDistance(event) {
        let customDistance = event.target.value;
        customDistance = this.normalizeToRange(customDistance, DISTANCE_MIN, DISTANCE_MAX);
        this.setState({ customDistance });
    }
    increaseCustomDistance() {
        const { unit } = this.props;
        let customDistance = Math.min(Number(this.state.customDistance) + DISTANCE_STEP, DISTANCE_MAX);
        if (unit === IMPERIAL_UNIT) {
            customDistance = customDistance.toFixed(4) * 1;
        }
        if (unit === METRIC_UNIT) {
            customDistance = customDistance.toFixed(3) * 1;
        }
        this.setState({ customDistance });
    }
    decreaseCustomDistance() {
        const { unit } = this.props;
        let customDistance = Math.max(Number(this.state.customDistance) - DISTANCE_STEP, DISTANCE_MIN);
        if (unit === IMPERIAL_UNIT) {
            customDistance = customDistance.toFixed(4) * 1;
        }
        if (unit === METRIC_UNIT) {
            customDistance = customDistance.toFixed(3) * 1;
        }
        this.setState({ customDistance });
    }
    toUnitValue(unit, val) {
        val = Number(val) || 0;
        if (unit === IMPERIAL_UNIT) {
            val = mm2in(val).toFixed(4) * 1;
        }
        if (unit === METRIC_UNIT) {
            val = val.toFixed(3) * 1;
        }

        return val;
    }
    render() {
        const { selectedDistance, customDistance } = this.state;
        const { unit } = this.props;
        const distance = String(selectedDistance); // force convert to string
        const isCustomDistanceSelected = !(_.includes(['1', '0.1', '0.01', '0.001'], distance));
        const classes = {
            1: classNames(
                'btn',
                'btn-default',
                { 'btn-select': distance === '1' }
            ),
            0.1: classNames(
                'btn',
                'btn-default',
                { 'btn-select': distance === '0.1' }
            ),
            0.01: classNames(
                'btn',
                'btn-default',
                { 'btn-select': distance === '0.01' }
            ),
            0.001: classNames(
                'btn',
                'btn-default',
                { 'btn-select': distance === '0.001' }
            ),
            custom: classNames(
                'btn',
                'btn-default',
                { 'btn-select': isCustomDistanceSelected }
            )
        };

        return (
            <div className="jog-distance-control">
                <div className="input-group input-group-xs">
                    <span className="input-group-addon">{i18n._('Move')}</span>
                    <div className="input-group-btn">
                        <button
                            type="button"
                            className={classes['1']}
                            title={'1 ' + unit}
                            onClick={() => this.changeSelectedDistance('1')}
                        >
                            1
                        </button>
                        <button
                            type="button"
                            className={classes['0.1']}
                            title={'0.1 ' + unit}
                            onClick={() => this.changeSelectedDistance('0.1')}
                        >
                            0.1
                        </button>
                        <button
                            type="button"
                            className={classes['0.01']}
                            title={'0.01 ' + unit}
                            onClick={() => this.changeSelectedDistance('0.01')}
                        >
                            0.01
                        </button>
                        <button
                            type="button"
                            className={classes['0.001']}
                            title={'0.001 ' + unit}
                            onClick={() => this.changeSelectedDistance('0.001')}
                        >
                            0.001
                        </button>
                        <button
                            type="button"
                            className={classes.custom}
                            title={i18n._('Custom')}
                            onClick={() => this.changeSelectedDistance('')}
                        >
                            {i18n._('Custom')}
                        </button>
                    </div>
                    <input
                        type="number"
                        className="form-control"
                        style={{ borderRadius: 0 }}
                        min={DISTANCE_MIN}
                        max={DISTANCE_MAX}
                        step={DISTANCE_STEP}
                        value={customDistance}
                        onChange={::this.handleChangeCustomDistance}
                        title={i18n._('Custom distance for every move operation')}
                    />
                    <div className="input-group-btn">
                        <PressAndHold
                            className="btn btn-default"
                            onClick={::this.increaseCustomDistance}
                            title={i18n._('Increase custom distance by one unit')}
                        >
                            <span className="fa fa-plus"></span>
                        </PressAndHold>
                        <PressAndHold
                            className="btn btn-default"
                            onClick={::this.decreaseCustomDistance}
                            title={i18n._('Decrease custom distance by one unit')}
                        >
                            <span className="fa fa-minus"></span>
                        </PressAndHold>
                    </div>
                </div>
            </div>
        );
    }
}

export default JogDistance;
