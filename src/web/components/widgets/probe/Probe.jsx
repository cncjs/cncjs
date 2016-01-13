import _ from 'lodash';
import classNames from 'classnames';
import pubsub from 'pubsub-js';
import React from 'react';
import i18n from '../../../lib/i18n';
import socket from '../../../lib/socket';
import serialport from '../../../lib/serialport';
import { in2mm, mm2in } from '../../../lib/units';
import ToolbarButton from './ToolbarButton';
import store from '../../../store';
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
        probeCommand: store.getState('widgets.probe.probeCommand'),
        probeDepth: this.toUnitValue(METRIC_UNIT, store.getState('widgets.probe.probeDepth')),
        probeFeedrate: this.toUnitValue(METRIC_UNIT, store.getState('widgets.probe.probeFeedrate')),
        tlo: this.toUnitValue(METRIC_UNIT, store.getState('widgets.probe.tlo')),
        retractionDistance: this.toUnitValue(METRIC_UNIT, store.getState('widgets.probe.retractionDistance'))
    };
    socketEventListener = {
        'grbl:current-status': ::this.socketOnGrblCurrentStatus,
        'grbl:gcode-modes': ::this.socketOnGrblGCodeModes
    };
    unitDidChange = false;

    componentDidMount() {
        this.subscribe();
        this.addSocketEventListener();
    }
    componentWillUnmount() {
        this.unsubscribe();
        this.removeSocketEventListener();
    }
    shouldComponentUpdate(nextProps, nextState) {
        return ! _.isEqual(nextState, this.state);
    }
    componentDidUpdate(prevProps, prevState) {
        // Do not save to store if the unit did change between in and mm
        if (this.unitDidChange) {
            this.unitDidChange = false;
            return;
        }

        let {
            unit,
            probeCommand,
            probeDepth,
            probeFeedrate,
            tlo,
            retractionDistance
        } = this.state;

        if (unit === IMPERIAL_UNIT) {
            probeDepth = in2mm(probeDepth);
            probeFeedrate = in2mm(probeFeedrate);
            tlo = in2mm(tlo);
            retractionDistance = in2mm(retractionDistance);
        }

        // To save in mm
        store.setState('widgets.probe.probeCommand', probeCommand);
        store.setState('widgets.probe.probeDepth', Number(probeDepth));
        store.setState('widgets.probe.probeFeedrate', Number(probeFeedrate));
        store.setState('widgets.probe.tlo', Number(tlo));
        store.setState('widgets.probe.retractionDistance', Number(retractionDistance));
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
        if (data.activeState === this.state.activeState) {
            return;
        }

        this.setState({
            activeState: data.activeState
        });
    }
    socketOnGrblGCodeModes(modes) {
        let { unit } = this.state;
        let nextUnit = unit;

        // Imperial
        if (_.includes(modes, 'G20')) {
            nextUnit = IMPERIAL_UNIT;
        }

        // Metric
        if (_.includes(modes, 'G21')) {
            nextUnit = METRIC_UNIT;
        }

        if (nextUnit === unit) {
            return;
        }

        // Set `this.unitDidChange` to true if the unit has changed
        this.unitDidChange = true;

        let {
            probeDepth,
            probeFeedrate,
            tlo,
            retractionDistance
        } = store.getState('widgets.probe');

        // unit conversion
        if (nextUnit === IMPERIAL_UNIT) {
            probeDepth = mm2in(probeDepth).toFixed(4) * 1;
            probeFeedrate = mm2in(probeFeedrate).toFixed(4) * 1;
            tlo = mm2in(tlo).toFixed(4) * 1;
            retractionDistance = mm2in(retractionDistance).toFixed(4) * 1;
        }
        if (nextUnit === METRIC_UNIT) {
            probeDepth = Number(probeDepth).toFixed(3) * 1;
            probeFeedrate = Number(probeFeedrate).toFixed(3) * 1;
            tlo = Number(tlo).toFixed(3) * 1;
            retractionDistance = Number(retractionDistance).toFixed(3) * 1;
        }
        this.setState({
            unit: nextUnit,
            probeDepth: probeDepth,
            probeFeedrate: probeFeedrate,
            tlo: tlo,
            retractionDistance: retractionDistance
        });
    }
    changeProbeCommand(value) {
        this.setState({ probeCommand: value });
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
                                <div className="btn-group" role="group"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default Probe;
