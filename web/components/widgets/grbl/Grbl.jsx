import _ from 'lodash';
import pubsub from 'pubsub-js';
import React from 'react';
import { DropdownButton, MenuItem } from 'react-bootstrap';
import i18n from '../../../lib/i18n';
import log from '../../../lib/log';
import socket from '../../../lib/socket';
import serialport from '../../../lib/serialport';
import { MODAL_GROUPS } from '../../../constants/modal-groups';
import {
    ACTIVE_STATE_IDLE
} from './constants';

class Grbl extends React.Component {
    state = {
        port: '',
        activeState: ACTIVE_STATE_IDLE,
        modes: {}
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
    subscribe() {
        this.pubsubTokens = [];

        { // port
            let token = pubsub.subscribe('port', (msg, port) => {
                port = port || '';
                this.setState({ port: port });

                if (!port) {
                    let modes = {};
                    this.setState({ modes: modes });
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
            activeState: data.activeState
        });
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
        return ! _.isEqual(nextState, this.state);
    }
    render() {
        let { port, activeState, modes } = this.state;
        let canClick = !!port;

        return (
            <div>
                <div className="btn-group btn-group-sm">
                    <button type="button"
                        className="btn btn-default"
                        onClick={() => serialport.write('~')}
                        disabled={!canClick}
                    >
                        <span className="code">~</span>&nbsp;{i18n._('Cycle Start')}
                    </button>
                    <button
                        type="button"
                        className="btn btn-default"
                        onClick={() => serialport.write('!')}
                        disabled={!canClick}
                    >
                        <span className="code">!</span>&nbsp;{i18n._('Feed Hold')}
                    </button>
                    <button
                        type="button"
                        className="btn btn-default"
                        onClick={() => serialport.write('\x18')}
                        disabled={!canClick}
                    >
                        <span className="code">Ctrl-X</span>&nbsp;{i18n._('Reset Grbl')}
                    </button>
                    <DropdownButton bsSize="sm" bsStyle="default" title="">
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
                <h6>{i18n._('Parser State')}</h6>
                <div className="container-fluid">
                    <div className="row no-gutter">
                        <div className="col col-xs-3">
                            {i18n._('State')}
                        </div>
                        <div className="col col-xs-9">
                            <div className="well well-xs">{activeState}</div>
                        </div>
                    </div>
                    <div className="row no-gutter">
                        <div className="col col-xs-3">
                            {i18n._('Feed Rate')}
                        </div>
                        <div className="col col-xs-3">
                            <div className="well well-xs">{_.get(modes, 'feedrate')}</div>
                        </div>
                        <div className="col col-xs-3">
                            {i18n._('Spindle')}
                        </div>
                        <div className="col col-xs-3">
                            <div className="well well-xs">{_.get(modes, 'spindle')}</div>
                        </div>
                    </div>
                    <div className="row no-gutter">
                        <div className="col col-xs-3">
                            {i18n._('Tool Number')}
                        </div>
                        <div className="col col-xs-3">
                            <div className="well well-xs">{_.get(modes, 'tool')}</div>
                        </div>
                    </div>
                </div>
                <h6 className="modal-groups-header">
                    {i18n._('Modal Groups')}
                </h6>
                <div className="container-fluid">
                    <div className="row no-gutter">
                        <div className="col col-xs-3">
                            {i18n._('Motion')}
                        </div>
                        <div className="col col-xs-3">
                            <div className="well well-xs">{_.get(modes, 'modal.motion')}</div>
                        </div>
                        <div className="col col-xs-3">
                            {i18n._('WCS')}
                        </div>
                        <div className="col col-xs-3">
                            <div className="well well-xs">{_.get(modes, 'modal.coordinate')}</div>
                        </div>
                    </div>
                    <div className="row no-gutter">
                        <div className="col col-xs-3">
                            {i18n._('Plane')}
                        </div>
                        <div className="col col-xs-3">
                            <div className="well well-xs">{_.get(modes, 'modal.plane')}</div>
                        </div>
                        <div className="col col-xs-3">
                            {i18n._('Distance')}
                        </div>
                        <div className="col col-xs-3">
                            <div className="well well-xs">{_.get(modes, 'modal.distance')}</div>
                        </div>
                    </div>
                    <div className="row no-gutter">
                        <div className="col col-xs-3">
                            {i18n._('Feed Rate')}
                        </div>
                        <div className="col col-xs-3">
                            <div className="well well-xs">{_.get(modes, 'modal.feedrate')}</div>
                        </div>
                        <div className="col col-xs-3">
                            {i18n._('Units')}
                        </div>
                        <div className="col col-xs-3">
                            <div className="well well-xs">{_.get(modes, 'modal.units')}</div>
                        </div>
                    </div>
                    <div className="row no-gutter">
                        <div className="col col-xs-3">
                            {i18n._('Program')}
                        </div>
                        <div className="col col-xs-3">
                            <div className="well well-xs">{_.get(modes, 'modal.program')}</div>
                        </div>
                        <div className="col col-xs-3">
                            {i18n._('Spindle')}
                        </div>
                        <div className="col col-xs-3">
                            <div className="well well-xs">{_.get(modes, 'modal.spindle')}</div>
                        </div>
                    </div>
                    <div className="row no-gutter">
                        <div className="col col-xs-3">
                            {i18n._('Coolant')}
                        </div>
                        <div className="col col-xs-3">
                            <div className="well well-xs">{_.get(modes, 'modal.coolant')}</div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default Grbl;
