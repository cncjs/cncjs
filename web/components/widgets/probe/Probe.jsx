import _ from 'lodash';
import i18n from 'i18next';
import pubsub from 'pubsub-js';
import React from 'react';
import Select from 'react-select';
import socket from '../../../lib/socket';
import serialport from '../../../lib/serialport';
import {
    IMPERIAL_UNIT,
    METRIC_UNIT,
    ACTIVE_STATE_IDLE
} from './constants';

const toCommandString = (cmd, params) => {
    let s = _.map(params, (value, letter) => {
        return '' + letter + value;
    }).join(' ');

    return cmd + ' ' + s;
};

const probeCommands = [
    {
        cmd: 'G38.2',
        description: 'G38.2 probe toward workpiece, stop on contact, signal error if failure'
    },
    {
        cmd: 'G38.3',
        description: 'G38.3 probe toward workpiece, stop on contact'
    },
    {
        cmd: 'G38.4',
        description: 'G38.4 probe away from workpiece, stop on loss of contact, signal error if failure'
    },
    {
        cmd: 'G38.5',
        description: 'G38.5 probe away from workpiece, stop on loss of contact'
    }
];

class Probe extends React.Component {
    state = {
        port: '',
        unit: METRIC_UNIT,
        activeState: ACTIVE_STATE_IDLE,
        probeCommand: 'G38.2',
        probeDepth: -10,
        probeFeedrate: 25,
        tlo: 10, // Tool Length Offsets (TLO)
        retractDistance: 2
    }

    componentDidMount() {
        this.subscribe();
        this.addSocketEvents();
    }
    componentWillUnmount() {
        this.unsubscribe();
        this.removeSocketEvents();
    }
    shouldComponentUpdate(nextProps, nextState) {
        return ! _.isEqual(nextState, this.state);
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
            this.resetToImperialDefaults();
        }

        // Metric
        if (_.includes(modes, 'G21')) {
            unit = METRIC_UNIT;
            this.resetToMetricDefaults();
        }

        if (this.state.unit !== unit) {
            this.setState({ unit: unit });
        }
    }
    resetToMetricDefaults() {
        this.setState({
            probeDepth: -10,
            probeFeedrate: 25,
            tlo: 10,
            retractDistance: 2
        });
    }
    resetToImperialDefaults() {
        this.setState({
            probeDepth: -0.5,
            probeFeedrate: 1,
            tlo: 0.5,
            retractDistance: 0.1
        });
    }
    changeProbeCommand(value) {
        this.setState({
            probeCommand: value
        });
    }
    renderProbeCommandOption(option) {
        let style = {
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            overflow: 'hidden'
        };
        return (
            <div style={style} title={option.label}>
                <div>{option.value}</div>
                <div>{option.label}</div>
            </div>
        );
    }
    renderProbeCommandValue(option) {
        let style = {
            textOverflow: 'ellipsis',
            overflow: 'hidden'
        };
        return (
            <div style={style} title={option.label}>{option.label}</div>
        );
    }
    handleProbeDepthChange(event) {
        let probeDepth = event.target.value;
        this.setState({ probeDepth: probeDepth });
    }
    handleProbeFeedrateChange(event) {
        let probeFeedrate = event.target.value;
        this.setState({ probeFeedrate: probeFeedrate });
    }
    handleTLOChange(event) {
        let tlo = event.target.value;
        this.setState({ tlo: tlo });
    }
    handleRetractDistanceChange(event) {
        let retractDistance = event.target.value;
        this.setState({ retractDistance: retractDistance });
    }
    handleRun() {
        serialport.writeln('G90'); // absolute distance mode
        serialport.writeln('G49'); // TLO cancel
        serialport.writeln('G92 Z0'); // zero out temporary Z axis
        serialport.writeln(toCommandString(this.state.probeCommand, {
            Z: this.state.probeDepth,
            F: this.state.probeFeedrate
        }));
        serialport.writeln(toCommandString('G43.1', { // dynamic tool length offset
            Z: this.state.tlo
        }));
        serialport.writeln('G91'); // relative distance mode
        serialport.writeln(toCommandString('G0', { // retract distance
            Z: this.state.retractDistance
        }));
        serialport.writeln('G90'); // absolute distance mode
    }
    render() {
        let { port, unit, activeState, probeDepth, probeFeedrate, tlo, retractDistance } = this.state;
        let displayUnit = (unit === METRIC_UNIT) ? i18n._('mm') : i18n._('in');
        let feedrateUnit = (unit === METRIC_UNIT) ? i18n._('mm/min') : i18n._('in/mm');
        let canClick = (!!port && (activeState === ACTIVE_STATE_IDLE));
        let probeCommandOptions = _.map(_.pluck(probeCommands, 'cmd'), (cmd) => {
            return { value: cmd, label: cmd }
        });

        return (
            <div>
                <div className="form-group">
                    <label className="control-label">{i18n._('Probe Command:')}</label>
                    <Select
                        className="sm"
                        name="probe-command"
                        value={this.state.probeCommand}
                        options={probeCommandOptions}
                        backspaceRemoves={false}
                        clearable={false}
                        searchable={false}
                        placeholder={i18n._('Choose a probe command')}
                        onChange={::this.changeProbeCommand}
                    />
                    <p>{_.findWhere(probeCommands, { cmd: this.state.probeCommand })['description']}</p>
                </div>
                <div className="container-fluid">
                    <div className="row no-gutter">
                        <div className="col-sm-6">
                            <div className="form-group">
                                <label className="control-label">{i18n._('Probe Depth:')}</label>
                                <div className="input-group input-group-xs">
                                    <input
                                        type="number"
                                        className="form-control"
                                        placeholder="0.00"
                                        max={0}
                                        step={1}
                                        value={probeDepth}
                                        onKeyDown={(e) => e.stopPropagation()}
                                        onChange={::this.handleProbeDepthChange}
                                    />
                                    <div className="input-group-addon">{displayUnit}</div>
                                </div>
                            </div>
                        </div>
                        <div className="col-sm-6">
                            <div className="form-group">
                                <label className="control-label">{i18n._('Probe Feedrate:')}</label>
                                <div className="input-group input-group-xs">
                                    <input
                                        type="number"
                                        className="form-control"
                                        placeholder="0.00"
                                        min={0}
                                        step={1}
                                        value={probeFeedrate}
                                        onChange={::this.handleProbeFeedrateChange}
                                    />
                                    <span className="input-group-addon">{feedrateUnit}</span>
                                </div>
                            </div>
                        </div>
                        <div className="col-sm-6">
                            <div className="form-group">
                                <label className="control-label">{i18n._('Touch Plate Thickness:')}</label>
                                <div className="input-group input-group-xs">
                                    <input
                                        type="number"
                                        className="form-control"
                                        placeholder="0.00"
                                        min={0}
                                        step={1}
                                        value={tlo}
                                        onChange={::this.handleTLOChange}
                                    />
                                    <span className="input-group-addon">{displayUnit}</span>
                                </div>
                            </div>
                        </div>
                        <div className="col-sm-6">
                            <div className="form-group">
                                <label className="control-label">{i18n._('Retract Distance:')}</label>
                                <div className="input-group input-group-xs">
                                    <input
                                        type="number"
                                        className="form-control"
                                        placeholder="0.00"
                                        min={0}
                                        step={1}
                                        value={retractDistance}
                                        onChange={::this.handleRetractDistanceChange}
                                    />
                                    <span className="input-group-addon">{displayUnit}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="row">
                        <button type="button" className="btn btn-sm btn-default" onClick={::this.handleRun} disabled={!canClick}>{i18n._('Run Z-probe')}</button>
                    </div>
                </div>
            </div>
        );
    }
}

export default Probe;
