import _ from 'lodash';
import i18n from 'i18next';
import pubsub from 'pubsub-js';
import React from 'react';
import socket from '../../../lib/socket';
import serialport from '../../../lib/serialport';
import {
    IMPERIAL_UNIT,
    METRIC_UNIT,
    ACTIVE_STATE_IDLE
} from './constants';

class Probe extends React.Component {
    state = {
        port: '',
        unit: METRIC_UNIT,
        activeState: ACTIVE_STATE_IDLE,
        depth: -10,
        feedrate: 25,
        tlo: 3, // Tool Length Offsets (TLO)
        retract: 2
    }

    componentDidMount() {
        this.subscribe();
        this.addSocketEvents();
    }
    componentWillUnmount() {
        this.unsubscribe();
        this.removeSocketEvents();
    }
    subscribe() {
        let that = this;

        this.pubsubTokens = [];

        { // port
            let token = pubsub.subscribe('port', (msg, port) => {
                port = port || '';
                that.setState({ port: port });
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
        socket.off('grbl:current-status', this.socketOnGrblCurrentStatus);
        socket.off('grbl:gcode-modes', this.socketOnGrblGCodeModes);
    }
    socketOnGrblCurrentStatus(data) {
        this.setState({
            activeState: data.activeState
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
    handleRun() {
        serialport.writeln('G21 G90 G49');
        serialport.writeln('G92 Z0');
        serialport.writeln('G38.2 Z-10 F25');
        serialport.writeln('G43.1 Z-3');
        serialport.writeln('G91 G0 Z2');
        serialport.writeln('G90');
    }
    render() {
        let { port, unit, activeState, depth, feedrate, tlo, retract } = this.state;
        let displayUnit = (unit === METRIC_UNIT) ? i18n._('mm') : i18n._('in');
        let feedrateUnit = (unit === METRIC_UNIT) ? i18n._('mm/min') : i18n._('in/mm');
        let canClick = (!!port && (activeState === ACTIVE_STATE_IDLE));

        return (
            <div>
                <form>
                    <div className="form-group">
                        <label for="probe-depth" className="control-label">{i18n._('Probe Depth:')}</label>
                        <div className="input-group input-group-xs">
                            <input type="number" className="form-control" id="probe-depth" placeholder="0.00" value={depth} max={0} disabled={!canClick} />
                            <span className="input-group-addon">{displayUnit}</span>
                        </div>
                    </div>
                    <div className="form-group">
                        <label for="probe-feedrate" className="control-label">{i18n._('Probe Feedrate:')}</label>
                        <div className="input-group input-group-xs">
                            <input type="number" className="form-control" id="probe-feedrate" placeholder="0.00" value={feedrate} min={0} disabled={!canClick} />
                            <span className="input-group-addon">{feedrateUnit}</span>
                        </div>
                    </div>
                    <div className="form-group">
                        <label for="probe-tlo" className="control-label">{i18n._('Touch Plate Thickness:')}</label>
                        <div className="input-group input-group-xs">
                            <input type="number" className="form-control" id="probe-tlo" placeholder="0.00" value={tlo} min={0} disabled={!canClick} />
                            <span className="input-group-addon">{displayUnit}</span>
                        </div>
                    </div>
                    <div className="form-group">
                        <label for="probe-retract" className="control-label">{i18n._('Retract:')}</label>
                        <div className="input-group input-group-xs">
                            <input type="number" className="form-control" id="probe-retract" placeholder="0.00" value={retract} min={0} disabled={!canClick} />
                            <span className="input-group-addon">{displayUnit}</span>
                        </div>
                    </div>
                    <div className="form-group">
                        <button type="button" className="btn btn-sm btn-default" onClick={::this.handleRun} disabled={!canClick}>{i18n._('Run Z-probe')}</button>
                    </div>
                </form>
            </div>
        );
    }
}

export default Probe;
