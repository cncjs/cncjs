import _ from 'lodash';
import classNames from 'classnames';
import React from 'react';
import i18n from '../../../lib/i18n';
import { in2mm, mm2in } from '../../../lib/units';
import store from '../../../store';
import Widget from '../../widget';
import Axes from './Axes';
import { show as showSettings } from './Settings';
import {
    ACTIVE_STATE_IDLE,
    IMPERIAL_UNIT,
    METRIC_UNIT,
    DISTANCE_MIN,
    DISTANCE_MAX,
    DISTANCE_STEP
} from './constants';
import './index.styl';

const toFixedUnitString = (unit, val) => {
    val = Number(val) || 0;
    if (unit === IMPERIAL_UNIT) {
        val = (val / 25.4).toFixed(4);
    }
    if (unit === METRIC_UNIT) {
        val = val.toFixed(3);
    }

    return String(val);
};

const toUnitValue = (unit, val) => {
    val = Number(val) || 0;
    if (unit === IMPERIAL_UNIT) {
        val = mm2in(val).toFixed(4) * 1;
    }
    if (unit === METRIC_UNIT) {
        val = val.toFixed(3) * 1;
    }

    return val;
};

const normalizeToRange = (n, min, max) => {
    if (n < min) {
        return min;
    }
    if (n > max) {
        return max;
    }
    return n;
};

class AxesWidget extends React.Component {
    static propTypes = {
        onDelete: React.PropTypes.func
    };
    static defaultProps = {
        onDelete: () => {}
    };

    state = {
        isCollapsed: false,
        isFullscreen: false,
        port: '',
        unit: METRIC_UNIT,
        activeState: ACTIVE_STATE_IDLE,
        machinePos: { // Machine position
            x: '0.000',
            y: '0.000',
            z: '0.000'
        },
        workingPos: { // Working position
            x: '0.000',
            y: '0.000',
            z: '0.000'
        },
        keypadJogging: store.get('widgets.axes.jog.keypad'),
        selectedAxis: '', // Defaults to empty
        selectedDistance: store.get('widgets.axes.jog.selectedDistance'),
        customDistance: toUnitValue(METRIC_UNIT, store.get('widgets.axes.jog.customDistance'))
    };

    shouldComponentUpdate(nextProps, nextState) {
        return !_.isEqual(nextProps, this.props) || !_.isEqual(nextState, this.state);
    }
    componentDidUpdate(prevProps, prevState) {
        // The custom distance will not persist to store while toggling between in and mm
        if ((prevState.customDistance !== this.state.customDistance) &&
            (prevState.unit === this.state.unit)) {
            let customDistance = this.state.customDistance;
            if (this.state.unit === IMPERIAL_UNIT) {
                customDistance = in2mm(customDistance);
            }
            // To save in mm
            store.set('widgets.axes.jog.customDistance', Number(customDistance));
        }

        if (prevState.selectedDistance !== this.state.selectedDistance) {
            // '1', '0.1', '0.01', '0.001' or ''
            store.set('widgets.axes.jog.selectedDistance', this.state.selectedDistance);
        }

        if (prevState.keypadJogging !== this.state.keypadJogging) {
            store.set('widgets.axes.jog.keypad', this.state.keypadJogging);
        }
    }
    resetStatus() {
        this.setState({
            activeState: ACTIVE_STATE_IDLE,
            machinePos: { // Machine position
                x: '0.000',
                y: '0.000',
                z: '0.000'
            },
            workingPos: { // Working position
                x: '0.000',
                y: '0.000',
                z: '0.000'
            }
        });
    }
    updateStatus({ activeState, machinePos, workingPos }) {
        this.setState({ activeState, machinePos, workingPos });
    }
    changePort(port) {
        this.setState({ port });
    }
    changeUnit(unit) {
        console.assert(unit === METRIC_UNIT || unit === IMPERIAL_UNIT);

        let customDistance = store.get('widgets.axes.jog.customDistance');
        if (unit === IMPERIAL_UNIT) {
            customDistance = mm2in(customDistance).toFixed(4) * 1;
        }
        if (unit === METRIC_UNIT) {
            customDistance = Number(customDistance).toFixed(3) * 1;
        }

        // Have to update unit and custom distance at the same time
        this.setState({
            unit: unit,
            customDistance: customDistance
        });
    }
    toggleKeypadJogging() {
        this.setState({ keypadJogging: !this.state.keypadJogging });
    }
    selectAxis(axis = '') {
        this.setState({ selectedAxis: axis });
    }
    selectDistance(distance = '') {
        this.setState({ selectedDistance: distance });
    }
    changeCustomDistance(customDistance) {
        customDistance = normalizeToRange(customDistance, DISTANCE_MIN, DISTANCE_MAX);
        this.setState({ customDistance: customDistance });
    }
    increaseCustomDistance() {
        const { unit, customDistance } = this.state;
        let distance = Math.min(Number(customDistance) + DISTANCE_STEP, DISTANCE_MAX);
        if (unit === IMPERIAL_UNIT) {
            distance = distance.toFixed(4) * 1;
        }
        if (unit === METRIC_UNIT) {
            distance = distance.toFixed(3) * 1;
        }
        this.setState({ customDistance: distance });
    }
    decreaseCustomDistance() {
        const { unit, customDistance } = this.state;
        let distance = Math.max(Number(customDistance) - DISTANCE_STEP, DISTANCE_MIN);
        if (unit === IMPERIAL_UNIT) {
            distance = distance.toFixed(4) * 1;
        }
        if (unit === METRIC_UNIT) {
            distance = distance.toFixed(3) * 1;
        }
        this.setState({ customDistance: distance });
    }
    render() {
        const { isCollapsed, isFullscreen } = this.state;
        const { unit, machinePos, workingPos, keypadJogging } = this.state;
        const classes = {
            widgetContent: classNames(
                { hidden: isCollapsed }
            )
        };

        const state = {
            ...this.state,
            machinePos: _.mapValues(machinePos, (pos, axis) => {
                return toFixedUnitString(unit, pos);
            }),
            workingPos: _.mapValues(workingPos, (pos, axis) => {
                return toFixedUnitString(unit, pos);
            })
        };
        const actions = {
            resetStatus: ::this.resetStatus,
            updateStatus: ::this.updateStatus,
            changePort: ::this.changePort,
            changeUnit: ::this.changeUnit,
            toggleKeypadJogging: ::this.toggleKeypadJogging,
            selectAxis: ::this.selectAxis,
            selectDistance: ::this.selectDistance,
            changeCustomDistance: ::this.changeCustomDistance,
            increaseCustomDistance: ::this.increaseCustomDistance,
            decreaseCustomDistance: ::this.decreaseCustomDistance
        };

        return (
            <div {...this.props} data-ns="widgets/axes">
                <Widget fullscreen={isFullscreen}>
                    <Widget.Header>
                        <Widget.Title>{i18n._('Axes')}</Widget.Title>
                        <Widget.Controls>
                            <Widget.Button
                                type="edit"
                                onClick={(event) => {
                                    showSettings();
                                }}
                            />
                            <Widget.Button
                                type="toggle"
                                defaultValue={isCollapsed}
                                onClick={(event, val) => this.setState({ isCollapsed: !!val })}
                            />
                            <Widget.Button
                                type="fullscreen"
                                defaultValue={isFullscreen}
                                onClick={(event, val) => this.setState({ isFullscreen: !!val })}
                            />
                            <Widget.Button
                                type="delete"
                                onClick={(event) => this.props.onDelete()}
                            />
                        </Widget.Controls>
                        <Widget.Toolbar>
                            <Widget.Button
                                type="default"
                                onClick={(event) => {
                                    this.toggleKeypadJogging();
                                }}
                            >
                                <i
                                    className={classNames(
                                        'fa',
                                        { 'fa-toggle-on': keypadJogging },
                                        { 'fa-toggle-off': !keypadJogging }
                                    )}
                                />
                                &nbsp;
                                {i18n._('Keypad')}
                            </Widget.Button>
                        </Widget.Toolbar>
                    </Widget.Header>
                    <Widget.Content className={classes.widgetContent}>
                        <Axes
                            ref="axes"
                            state={state}
                            actions={actions}
                        />
                    </Widget.Content>
                </Widget>
            </div>
        );
    }
}

export default AxesWidget;
