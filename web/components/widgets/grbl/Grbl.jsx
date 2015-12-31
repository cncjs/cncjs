import _ from 'lodash';
import pubsub from 'pubsub-js';
import React from 'react';
import { DropdownButton, MenuItem } from 'react-bootstrap';
import i18n from '../../../lib/i18n';
import log from '../../../lib/log';
import socket from '../../../lib/socket';
import serialport from '../../../lib/serialport';
import { MODAL_GROUPS } from '../../../constants/modal-groups';

class Grbl extends React.Component {
    state = {
        port: '',
        modes: {
        }
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

                if (!port) {
                    let modes = {};
                    that.setState({ modes: modes });
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
        socket.on('grbl:gcode-modes', ::this.socketOnGrblGCodeModes);
    }
    removeSocketEvents() {
        socket.off('grbl:gcode-modes', this.socketOnGrblGCodeModes);
    }
    socketOnGrblGCodeModes(modes) {
        let state = {};

        _.each(modes, (mode) => {
            // Gx, Mx
            if (mode.indexOf('G') === 0 || mode.indexOf('M') === 0) {
                let r = _.find(MODAL_GROUPS, (group) => {
                    return _.includes(group.modes, mode);
                });
                if (r) {
                    _.set(state, 'modal.' + r.group, mode);
                }
            }

            // T: tool number
            if (mode.indexOf('T') === 0) {
                _.set(state, 'tool', mode.substring(1));
            }

            // F: feed rate
            if (mode.indexOf('F') === 0) {
                _.set(state, 'feedrate', mode.substring(1));
            }

            // S: spindle speed
            if (mode.indexOf('S') === 0) {
                _.set(state, 'spindle', mode.substring(1));
            }
        });

        this.setState({ modes: state });

        log.trace(state);
    }
    shouldComponentUpdate(nextProps, nextState) {
        return JSON.stringify(nextState) !== JSON.stringify(this.state);
    }
    render() {
        let { port, modes } = this.state;
        let canClick = !!port;

        return (
            <div>
                <div className="form-group">
                    <div className="btn-group btn-group-justified" role="group" aria-label="...">
                        <DropdownButton bsSize="sm" bsStyle="default" title={i18n._('Real-Time Commands')} id="realtime-commands">
                            <MenuItem onSelect={() => serialport.write('~')} disabled={!canClick}>{i18n._('Cycle Start (~)')}</MenuItem>
                            <MenuItem onSelect={() => serialport.write('!')} disabled={!canClick}>{i18n._('Feed Hold (!)')}</MenuItem>
                            <MenuItem onSelect={() => serialport.write('?')} disabled={!canClick}>{i18n._('Current Status (?)')}</MenuItem>
                            <MenuItem onSelect={() => serialport.write('\x18')} disabled={!canClick}>{i18n._('Reset Grbl (Ctrl-X)')}</MenuItem>
                        </DropdownButton>
                        <DropdownButton bsSize="sm" bsStyle="default" title={i18n._('System Commands')} id="system-commands">
                            <MenuItem onSelect={() => serialport.writeln('$')} disabled={!canClick}>{i18n._('Grbl Help ($)')}</MenuItem>
                            <MenuItem onSelect={() => serialport.writeln('$$')} disabled={!canClick}>{i18n._('Grbl Settings ($$)')}</MenuItem>
                            <MenuItem onSelect={() => serialport.writeln('$#')} disabled={!canClick}>{i18n._('View G-code Parameters ($#)')}</MenuItem>
                            <MenuItem onSelect={() => serialport.writeln('$G')} disabled={!canClick}>{i18n._('View G-code Parser State ($G)')}</MenuItem>
                            <MenuItem onSelect={() => serialport.writeln('$I')} disabled={!canClick}>{i18n._('View Build Info ($I)')}</MenuItem>
                            <MenuItem onSelect={() => serialport.writeln('$N')} disabled={!canClick}>{i18n._('View Startup Blocks ($N)')}</MenuItem>
                            <MenuItem divider />
                            <MenuItem onSelect={() => serialport.writeln('$C')} disabled={!canClick}>{i18n._('Check G-code Mode ($C)')}</MenuItem>
                            <MenuItem onSelect={() => serialport.writeln('$X')} disabled={!canClick}>{i18n._('Kill Alarm Lock ($X)')}</MenuItem>
                            <MenuItem onSelect={() => serialport.writeln('$H')} disabled={!canClick}>{i18n._('Run Homing Cycle ($H)')}</MenuItem>
                        </DropdownButton>
                    </div>
                </div>
                <div className="row">
                    <div className="col col-xs-6">
                        {i18n._('Feed rate:')}
                    </div>
                    <div className="col col-xs-6">
                        {_.get(modes, 'feedrate')}
                    </div>
                </div>
                <div className="row">
                    <div className="col col-xs-6">
                        {i18n._('Spindle speed:')}
                    </div>
                    <div className="col col-xs-6">
                        {_.get(modes, 'spindle')}
                    </div>
                </div>
                <div className="row">
                    <div className="col col-xs-6">
                        {i18n._('Tool number:')}
                    </div>
                    <div className="col col-xs-6">
                        {_.get(modes, 'tool')}
                    </div>
                </div>
                <div className="row">
                    <div className="col col-xs-6">
                        {i18n._('Motion mode:')}
                    </div>
                    <div className="col col-xs-6">
                        {_.get(modes, 'modal.motion')}
                    </div>
                </div>
                <div className="row">
                    <div className="col col-xs-6">
                        {i18n._('Coordinate system select:')}
                    </div>
                    <div className="col col-xs-6">
                        {_.get(modes, 'modal.coordinate')}
                    </div>
                </div>
                <div className="row">
                    <div className="col col-xs-6">
                        {i18n._('Plane select:')}
                    </div>
                    <div className="col col-xs-6">
                        {_.get(modes, 'modal.plane')}
                    </div>
                </div>
                <div className="row">
                    <div className="col col-xs-6">
                        {i18n._('Distance mode:')}
                    </div>
                    <div className="col col-xs-6">
                        {_.get(modes, 'modal.distance')}
                    </div>
                </div>
                <div className="row">
                    <div className="col col-xs-6">
                        {i18n._('Feed rate mode:')}
                    </div>
                    <div className="col col-xs-6">
                        {_.get(modes, 'modal.feedrate')}
                    </div>
                </div>
                <div className="row">
                    <div className="col col-xs-6">
                        {i18n._('Units mode:')}
                    </div>
                    <div className="col col-xs-6">
                        {_.get(modes, 'modal.units')}
                    </div>
                </div>
                <div className="row">
                    <div className="col col-xs-6">
                        {i18n._('Program mode:')}
                    </div>
                    <div className="col col-xs-6">
                        {_.get(modes, 'modal.program')}
                    </div>
                </div>
                <div className="row">
                    <div className="col col-xs-6">
                        {i18n._('Spindle state:')}
                    </div>
                    <div className="col col-xs-6">
                        {_.get(modes, 'modal.spindle')}
                    </div>
                </div>
                <div className="row">
                    <div className="col col-xs-6">
                        {i18n._('Coolant state:')}
                    </div>
                    <div className="col col-xs-6">
                        {_.get(modes, 'modal.coolant')}
                    </div>
                </div>
            </div>
        );
    }
}

export default Grbl;
