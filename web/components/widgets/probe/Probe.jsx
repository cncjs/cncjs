import _ from 'lodash';
import pubsub from 'pubsub-js';
import React from 'react';
import Select from 'react-select';
import i18n from '../../../lib/i18n';
import socket from '../../../lib/socket';
import serialport from '../../../lib/serialport';
import ToolbarButton from './ToolbarButton';
import {
    IMPERIAL_UNIT,
    METRIC_UNIT,
    ACTIVE_STATE_IDLE
} from './constants';

class Probe extends React.Component {
    state = {
        port: '',
        unit: METRIC_UNIT,
        activeState: ACTIVE_STATE_IDLE
    }

    constructor(props) {
        super(props);

        let defaults = this.getUnitDefaults();
        this.state = _.defaults({}, this.state, defaults);
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
        }

        // Metric
        if (_.includes(modes, 'G21')) {
            unit = METRIC_UNIT;
        }

        if (unit === this.state.unit) {
            return;
        }

        this.setState({ unit: unit });
    }
    getUnitDefaults() {
        if (this.state.unit === METRIC_UNIT) {
            return {
                probeCommand: 'G38.2',
                probeDepth: 10,
                probeFeedrate: 20,
                tlo: 10,
                retractionDistance: 2
            };
        }
        if (this.state.unit === IMPERIAL_UNIT) {
            return {
                probeCommand: 'G38.2',
                probeDepth: 0.5,
                probeFeedrate: 1,
                tlo: 0.5,
                retractionDistance: 0.1
            };
        }
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
    handleRetractionDistanceChange(event) {
        let retractionDistance = event.target.value;
        this.setState({ retractionDistance: retractionDistance });
    }
    sendGCode(gcode, params) {
        let s = _.map(params, (value, letter) => {
            return '' + letter + value;
        }).join(' ');
        let msg = (s.length > 0) ? (gcode + ' ' + s) : gcode;
        serialport.writeln(msg);
    }
    runZProbe() {
        // Set relative distance mode
        this.sendGCode('G91');

        // Cancel Tool Length Offset (TLO)
        this.sendGCode('G49');

        // Start Z-probing
        this.sendGCode(this.state.probeCommand, {
            Z: -this.state.probeDepth,
            F: this.state.probeFeedrate
        });

        // Set TLO to the height of touch plate
        this.sendGCode('G43.1', {
            Z: this.state.tlo
        });

        // Zero out work z axis
        this.sendGCode('G10', {
            L: 20,
            P: 1,
            Z: 0
        });

        // Retract slightly from the touch plate
        this.sendGCode('G0', {
            Z: this.state.retractionDistance
        });

        // Set asolute distance mode
        this.sendGCode('G90');
    }
    restoreDefaults() {
        // FIXME
    }
    render() {
        let { port, unit, activeState } = this.state;
        let { probeCommand, probeDepth, probeFeedrate, tlo, retractionDistance } = this.state;
        let displayUnit = (unit === METRIC_UNIT) ? i18n._('mm') : i18n._('in');
        let feedrateUnit = (unit === METRIC_UNIT) ? i18n._('mm/min') : i18n._('in/mm');
        let canClick = (!!port && (activeState === ACTIVE_STATE_IDLE));
        let probeCommandOptions = _.map(['G38.2', 'G38.3', 'G38.4', 'G38.5'], (cmd) => {
            return {
                value: cmd,
                label: cmd
            };
        });

        return (
            <div>
                <ToolbarButton
                    port={port}
                    activeState={activeState}
                />
                <div className="form-group">
                    <label className="control-label">{i18n._('Probe Command:')}</label>
                    <Select
                        className="sm"
                        name="probe-command"
                        value={probeCommand}
                        options={probeCommandOptions}
                        backspaceRemoves={false}
                        clearable={false}
                        searchable={false}
                        placeholder={i18n._('Choose a probe command')}
                        onChange={::this.changeProbeCommand}
                    />
                    {probeCommand === 'G38.2' &&
                        <p>{i18n._('G38.2 probe toward workpiece, stop on contact, signal error if failure')}</p>
                    }
                    {probeCommand === 'G38.3' &&
                        <p>{i18n._('G38.3 probe toward workpiece, stop on contact')}</p>
                    }
                    {probeCommand === 'G38.4' &&
                        <p>{i18n._('G38.4 probe away from workpiece, stop on loss of contact, signal error if failure')}</p>
                    }
                    {probeCommand === 'G38.5' &&
                        <p>{i18n._('G38.5 probe away from workpiece, stop on loss of contact')}</p>
                    }
                </div>
                <div className="container-fluid">
                    <div className="row no-gutter probe-controls">
                        <div className="col-sm-6">
                            <div className="form-group">
                                <label className="control-label">{i18n._('Probe Depth:')}</label>
                                <div className="input-group input-group-xs">
                                    <input
                                        type="number"
                                        className="form-control"
                                        defaultValue={probeDepth}
                                        placeholder="0.00"
                                        min={0}
                                        step={1}
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
                                        defaultValue={probeFeedrate}
                                        placeholder="0.00"
                                        min={0}
                                        step={1}
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
                                        defaultValue={tlo}
                                        placeholder="0.00"
                                        min={0}
                                        step={1}
                                        onChange={::this.handleTLOChange}
                                    />
                                    <span className="input-group-addon">{displayUnit}</span>
                                </div>
                            </div>
                        </div>
                        <div className="col-sm-6">
                            <div className="form-group">
                                <label className="control-label">{i18n._('Retraction Distance:')}</label>
                                <div className="input-group input-group-xs">
                                    <input
                                        type="number"
                                        className="form-control"
                                        defaultValue={retractionDistance}
                                        placeholder="0.00"
                                        min={0}
                                        step={1}
                                        onChange={::this.handleRetractionDistanceChange}
                                    />
                                    <span className="input-group-addon">{displayUnit}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="row no-gutter">
                        <div className="col-sm-12">
                            <div className="btn-toolbar">
                                <div className="btn-group" role="group">
                                    <button type="button" className="btn btn-sm btn-default" onClick={::this.runZProbe} disabled={!canClick}>{i18n._('Run Z-probe')}</button>
                                </div>
                                <div className="btn-group" role="group">
                                    <button type="button" className="btn btn-sm btn-default" onClick={::this.restoreDefaults} disabled={!canClick}>{i18n._('Restore Defaults')}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default Probe;
