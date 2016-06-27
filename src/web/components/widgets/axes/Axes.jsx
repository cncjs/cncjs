import _ from 'lodash';
import pubsub from 'pubsub-js';
import React from 'react';
import controller from '../../../lib/controller';
import { in2mm, mm2in } from '../../../lib/units';
import store from '../../../store';
import Toolbar from './Toolbar';
import DisplayPanel from './DisplayPanel';
import ControlPanel from './ControlPanel';
import { show as showSettings } from './Settings';
import {
    ACTIVE_STATE_IDLE,
    IMPERIAL_UNIT,
    METRIC_UNIT,
    DISTANCE_MIN,
    DISTANCE_MAX,
    DISTANCE_STEP
} from './constants';

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

class Axes extends React.Component {
    state = {
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
        jogMode: false,
        selectedAxis: '', // Defaults to empty
        selectedDistance: store.get('widgets.axes.jog.selectedDistance'),
        customDistance: toUnitValue(METRIC_UNIT, store.get('widgets.axes.jog.customDistance'))
    };
    controllerEvents = {
        'grbl:status': (data) => {
            this.setState({
                activeState: data.activeState,
                machinePos: data.machinePos,
                workingPos: data.workingPos
            });
        },
        'grbl:parserstate': (parserstate) => {
            let unit = this.state.unit;

            // Imperial
            if (parserstate.modal.units === 'G20') {
                unit = IMPERIAL_UNIT;
            }

            // Metric
            if (parserstate.modal.units === 'G21') {
                unit = METRIC_UNIT;
            }

            if (this.state.unit !== unit) {
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
        }
    };

    componentDidMount() {
        this.subscribe();
        this.addControllerEvents();
    }
    componentWillUnmount() {
        this.unsubscribe();
        this.removeControllerEvents();
    }
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
            console.log('selectedDistance:', this.state.selectedDistance);
        }
    }
    subscribe() {
        this.pubsubTokens = [];

        { // port
            const token = pubsub.subscribe('port', (msg, port) => {
                port = port || '';
                this.setState({ port });

                if (!port) {
                    this.resetCurrentStatus();
                }
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
    edit() {
        showSettings();
    }
    resetCurrentStatus() {
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
    toFixedUnitString(unit, val) {
        val = Number(val) || 0;
        if (unit === IMPERIAL_UNIT) {
            val = (val / 25.4).toFixed(4);
        }
        if (unit === METRIC_UNIT) {
            val = val.toFixed(3);
        }

        return String(val);
    }
    changeUnit(unit) {
        console.assert(unit === METRIC_UNIT || unit === IMPERIAL_UNIT);
        this.setState({ unit: unit });
    }
    toggleJogMode() {
        this.setState({ jogMode: !this.state.jogMode });
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
        const { unit } = this.state;
        const machinePos = _.mapValues(this.state.machinePos, (pos, axis) => this.toFixedUnitString(unit, pos));
        const workingPos = _.mapValues(this.state.workingPos, (pos, axis) => this.toFixedUnitString(unit, pos));

        const props = {
            state: {
                ...this.state,
                machinePos: machinePos,
                workingPos: workingPos
            },
            actions: {
                toggleJogMode: ::this.toggleJogMode,
                selectAxis: ::this.selectAxis,
                selectDistance: ::this.selectDistance,
                changeCustomDistance: ::this.changeCustomDistance,
                increaseCustomDistance: ::this.increaseCustomDistance,
                decreaseCustomDistance: ::this.decreaseCustomDistance
            }
        };

        return (
            <div>
                <Toolbar {...props} />
                <DisplayPanel {...props} />
                <ControlPanel {...props} />
            </div>
        );
    }
}

export default Axes;
