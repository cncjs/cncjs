import _ from 'lodash';
import classNames from 'classnames';
import pubsub from 'pubsub-js';
import React from 'react';
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
        activeState: ACTIVE_STATE_IDLE,
        probeCommand: 'G38.2',
        probeDepth: 10,
        probeFeedrate: 20,
        tlo: 10,
        retractionDistance: 2
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
        this.pubsubTokens = [];

        { // port
            let token = pubsub.subscribe('port', (msg, port) => {
                port = port || '';
                this.setState({ port: port });
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
        if (data.activeState === this.state.activeState) {
            return;
        }

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

        let defaults = this.getUnitDefaults(unit);
        let state = _.extend({}, this.state, defaults, { unit: unit });

        this.setState(state);
    }
    getUnitDefaults(unit) {
        unit = unit || this.state.unit;

        if (unit === METRIC_UNIT) {
            return {
                probeDepth: 10,
                probeFeedrate: 20,
                tlo: 10,
                retractionDistance: 2
            };
        }
        if (unit === IMPERIAL_UNIT) {
            return {
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
        let { probeCommand, probeDepth, probeFeedrate, tlo, retractionDistance } = this.state;

        if (_.includes(['G38.2', 'G38.3'], probeCommand)) {
            probeDepth = -probeDepth;
        }

        // Cancel Tool Length Offset (TLO)
        this.sendGCode('G49');

        // Set relative distance mode
        this.sendGCode('G91');

        // Start Z-probing
        this.sendGCode(probeCommand, {
            Z: probeDepth,
            F: probeFeedrate
        });

        // Set back to asolute distance mode
        this.sendGCode('G90');

        // Zero out work z axis
        this.sendGCode('G10', {
            L: 20,
            P: 1,
            Z: 0
        });

        // Set TLO to the height of touch plate
        this.sendGCode('G43.1', {
            Z: -tlo
        });

        // Set relative distance mode
        this.sendGCode('G91');

        // Retract slightly from the touch plate
        this.sendGCode('G0', {
            Z: retractionDistance
        });

        // Set back to asolute distance mode
        this.sendGCode('G90');
    }
    restoreDefaults() {
        let defaults = this.getUnitDefaults();
        this.setState(defaults);
    }
    render() {
        let { port, unit, activeState } = this.state;
        let { probeCommand, probeDepth, probeFeedrate, tlo, retractionDistance } = this.state;
        let displayUnit = (unit === METRIC_UNIT) ? i18n._('mm') : i18n._('in');
        let feedrateUnit = (unit === METRIC_UNIT) ? i18n._('mm/min') : i18n._('in/mm');
        let step = (unit === METRIC_UNIT) ? 1 : 0.1;
        let canClick = (!!port && (activeState === ACTIVE_STATE_IDLE));
        let probeCommandOptions = _.map(['G38.2', 'G38.3', 'G38.4', 'G38.5'], (cmd) => {
            return {
                value: cmd,
                label: cmd
            };
        });
        let classes = {
            'G38.2': classNames(
                'btn',
                { 'btn-inverse': probeCommand === 'G38.2' },
                { 'btn-default': probeCommand !== 'G38.2' }
            ),
            'G38.3': classNames(
                'btn',
                { 'btn-inverse': probeCommand === 'G38.3' },
                { 'btn-default': probeCommand !== 'G38.3' }
            ),
            'G38.4': classNames(
                'btn',
                { 'btn-inverse': probeCommand === 'G38.4' },
                { 'btn-default': probeCommand !== 'G38.4' }
            ),
            'G38.5': classNames(
                'btn',
                { 'btn-inverse': probeCommand === 'G38.5' },
                { 'btn-default': probeCommand !== 'G38.5' }
            )
        };

        return (
            <div>
                <ToolbarButton
                    port={port}
                    activeState={activeState}
                />
                <div className="form-group">
                    <label className="control-label">{i18n._('Probe Command:')}</label>
                    <div className="btn-toolbar" role="toolbar">
                        <div className="btn-group btn-group-xs">
                            <button
                                type="button"
                                className={classes['G38.2']}
                                title={i18n._('G38.2 probe toward workpiece, stop on contact, signal error if failure')}
                                onClick={() => this.changeProbeCommand('G38.2')}
                            >
                                G38.2
                            </button>
                            <button
                                type="button"
                                className={classes['G38.3']}
                                title={i18n._('G38.3 probe toward workpiece, stop on contact')}
                                onClick={() => this.changeProbeCommand('G38.3')}
                            >
                                G38.3
                            </button>
                            <button
                                type="button"
                                className={classes['G38.4']}
                                title={i18n._('G38.4 probe away from workpiece, stop on loss of contact, signal error if failure')}
                                onClick={() => this.changeProbeCommand('G38.4')}
                            >
                                G38.4
                            </button>
                            <button
                                type="button"
                                className={classes['G38.5']}
                                title={i18n._('G38.5 probe away from workpiece, stop on loss of contact')}
                                onClick={() => this.changeProbeCommand('G38.5')}
                            >
                                G38.5
                            </button>
                        </div>
                    </div>
                    <p className="probe-command-description">
                    {probeCommand === 'G38.2' &&
                        <i>{i18n._('G38.2 probe toward workpiece, stop on contact, signal error if failure')}</i>
                    }
                    {probeCommand === 'G38.3' &&
                        <i>{i18n._('G38.3 probe toward workpiece, stop on contact')}</i>
                    }
                    {probeCommand === 'G38.4' &&
                        <i>{i18n._('G38.4 probe away from workpiece, stop on loss of contact, signal error if failure')}</i>
                    }
                    {probeCommand === 'G38.5' &&
                        <i>{i18n._('G38.5 probe away from workpiece, stop on loss of contact')}</i>
                    }
                    </p>
                </div>
                <div className="container-fluid">
                    <div className="row no-gutter probe-options">
                        <div className="col-sm-6">
                            <div className="form-group">
                                <label className="control-label">{i18n._('Probe Depth:')}</label>
                                <div className="input-group input-group-xs">
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={probeDepth}
                                        placeholder="0.00"
                                        min={0}
                                        step={step}
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
                                        value={probeFeedrate}
                                        placeholder="0.00"
                                        min={0}
                                        step={step}
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
                                        value={tlo}
                                        placeholder="0.00"
                                        min={0}
                                        step={step}
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
                                        value={retractionDistance}
                                        placeholder="0.00"
                                        min={0}
                                        step={step}
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
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-default"
                                        onClick={::this.runZProbe}
                                        disabled={!canClick}
                                    >
                                        {i18n._('Run Z-probe')}
                                    </button>
                                </div>
                                <div className="btn-group" role="group">
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-default"
                                        onClick={::this.restoreDefaults}
                                    >
                                        {i18n._('Restore Defaults')}
                                    </button>
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
