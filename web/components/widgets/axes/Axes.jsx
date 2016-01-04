import _ from 'lodash';
import pubsub from 'pubsub-js';
import React from 'react';
import i18n from '../../../lib/i18n';
import socket from '../../../lib/socket';
import serialport from '../../../lib/serialport';
import ToolbarButton from './ToolbarButton';
import DisplayPanel from './DisplayPanel';
import ControlPanel from './ControlPanel';
import {
    ACTIVE_STATE_IDLE,
    IMPERIAL_UNIT,
    METRIC_UNIT
} from './constants';

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
        }
    };
    socketEventListener = {
        'grbl:current-status': ::this.socketOnGrblCurrentStatus,
        'grbl:gcode-modes': ::this.socketOnGrblGCodeModes
    };

    componentDidMount() {
        this.subscribe();
        this.addSocketEventListener();
    }
    componentWillUnmount() {
        this.unsubscribe();
        this.removeSocketEventListener();
    }
    shouldComponentUpdate(nextProps, nextState) {
        return JSON.stringify(nextState) !== JSON.stringify(this.state);
    }
    subscribe() {
        this.pubsubTokens = [];

        { // port
            let token = pubsub.subscribe('port', (msg, port) => {
                port = port || '';
                this.setState({ port: port });

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
    addSocketEventListener() {
        _.each(this.socketEventListener, (callback, eventName) => {
            socket.on(eventName, callback);
        });
    }
    removeSocketEventListener() {
        _.each(this.socketEventListener, (callback, eventName) => {
            socket.off(eventName, callback);
        });
    }
    socketOnGrblCurrentStatus(data) {
        this.setState({
            activeState: data.activeState,
            machinePos: data.machinePos,
            workingPos: data.workingPos
        });
    }
    socketOnGrblGCodeModes(modes) {
        let unit = this.state.unit;

        // Imperial
        if (_.includes(modes, 'G20')) {
            unit = IMPERIAL_UNIT;
        }

        // Metric
        if (_.includes(modes, 'G21')) {
            unit = METRIC_UNIT;
        }

        if (this.state.unit !== unit) {
            this.setState({ unit: unit });
        }
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
    toUnitString(val) {
        val = Number(val) || 0;
        if (this.state.unit === METRIC_UNIT) {
            val = (val / 1).toFixed(3);
        } else {
            val = (val / 25.4).toFixed(4);
        }
        return '' + val;
    }
    render() {
        let { port, unit, activeState, machinePos, workingPos } = this.state;
        let canClick = (!!port && (activeState === ACTIVE_STATE_IDLE));

        machinePos = _.mapValues(machinePos, (pos, axis) => this.toUnitString(pos));
        workingPos = _.mapValues(workingPos, (pos, axis) => this.toUnitString(pos));

        return (
            <div>
                <ToolbarButton
                    port={port}
                    unit={unit}
                    activeState={activeState}
                />

                <DisplayPanel
                    port={port}
                    unit={unit}
                    activeState={activeState}
                    machinePos={machinePos}
                    workingPos={workingPos}
                />

                <ControlPanel
                    port={port}
                    unit={unit}
                    activeState={activeState}
                    machinePos={machinePos}
                    workingPos={workingPos}
                />
            </div>
        );
    }
}

export default Axes;
