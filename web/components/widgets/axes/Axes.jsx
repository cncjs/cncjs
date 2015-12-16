import _ from 'lodash';
import i18n from 'i18next';
import pubsub from 'pubsub-js';
import React from 'react';
import { DropdownButton, MenuItem } from 'react-bootstrap';
import socket from '../../../lib/socket';
import serialport from '../../../lib/serialport';
import DisplayPanel from './DisplayPanel';
import JogControlPanel from './JogControlPanel';
import {
    ACTIVE_STATE_IDLE,
    ACTIVE_STATE_RUN,
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

    componentDidMount() {
        this.subscribe();
        this.addSocketEvents();
    }
    componentWillUnmount() {
        this.unsubscribe();
        this.removeSocketEvents();
    }
    shouldComponentUpdate(nextProps, nextState) {
        return JSON.stringify(nextState) !== JSON.stringify(this.state);
    }
    subscribe() {
        let that = this;

        this.pubsubTokens = [];

        { // port
            let token = pubsub.subscribe('port', (msg, port) => {
                port = port || '';
                that.setState({ port: port });

                if (!port) {
                    that.resetCurrentStatus();
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
    addSocketEvents() {
        socket.on('grbl:current-status', ::this.socketOnGrblCurrentStatus);
        socket.on('grbl:gcode-modes', ::this.socketOnGrblGCodeModes);
    }
    removeSocketEvents() {
        socket.off('grbl:current-status', ::this.socketOnGrblCurrentStatus);
        socket.off('grbl:gcode-modes', ::this.socketOnGrblGCodeModes);
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
    toggleDisplayUnit() {
        if (this.state.unit === METRIC_UNIT) {
            serialport.writeln('G20'); // G20 specifies Imperial (inch) unit
        } else {
            serialport.writeln('G21'); // G21 specifies Metric (mm) unit
        }
    }
    handleSendCommand(target, eventKey) {
        let cmd = eventKey;
        if (cmd) {
            serialport.writeln(cmd);
        }
    }
    render() {
        let { port, unit, activeState, machinePos, workingPos } = this.state;
        let canClick = (!!port && (activeState !== ACTIVE_STATE_RUN));

        return (
            <div>
                <div className="toolbar-button btn-group">
                    <button type="button" className="btn btn-xs btn-default" onClick={::this.toggleDisplayUnit} disabled={!canClick}>{i18n._('in / mm')}</button>
                    <DropdownButton bsSize="xs" bsStyle="default" title="XYZ" id="axes-dropdown" pullRight>
                        <MenuItem header>{i18n._('Temporary Offsets (G92)')}</MenuItem>
                        <MenuItem eventKey='G92 X0 Y0 Z0' onSelect={::this.handleSendCommand} disabled={!canClick}>{i18n._('Zero Out Temporary Offsets (G92 X0 Y0 Z0)')}</MenuItem>
                        <MenuItem eventKey='G92.1 X0 Y0 Z0' onSelect={::this.handleSendCommand} disabled={!canClick}>{i18n._('Un-Zero Out Temporary Offsets (G92.1 X0 Y0 Z0)')}</MenuItem>
                        <MenuItem divider />
                        <MenuItem header>{i18n._('Work Coordinate System (G54)')}</MenuItem>
                        <MenuItem eventKey='G0 X0 Y0 Z0' onSelect={::this.handleSendCommand} disabled={!canClick}>{i18n._('Go To Work Zero (G0 X0 Y0 Z0)')}</MenuItem>
                        <MenuItem eventKey='G10 L2 P1 X0 Y0 Z0' onSelect={::this.handleSendCommand} disabled={!canClick}>{i18n._('Zero Out Work Offsets (G10 L2 P1 X0 Y0 Z0)')}</MenuItem>
                        <MenuItem divider />
                        <MenuItem header>{i18n._('Machine Coordinate System (G53)')}</MenuItem>
                        <MenuItem eventKey='G53 G0 X0 Y0 Z0' onSelect={::this.handleSendCommand} disabled={!canClick}>{i18n._('Go To Machine Zero (G53 G0 X0 Y0 Z0)')}</MenuItem>
                    </DropdownButton>
                </div>

                <DisplayPanel
                    port={port}
                    unit={unit}
                    activeState={activeState}
                    machinePos={machinePos}
                    workingPos={workingPos}
                />

                <JogControlPanel
                    port={port}
                    unit={unit}
                    activeState={activeState}
                />
            </div>
        );
    }
}

export default Axes;
