import _ from 'lodash';
import i18n from 'i18next';
import pubsub from 'pubsub-js';
import React from 'react';
import { DropdownButton, MenuItem } from 'react-bootstrap';
import classNames from 'classnames';
import Widget, { WidgetHeader, WidgetContent } from '../widget';
import log from '../../lib/log';
import socket from '../../socket';
import './grbl.css';

//
// https://github.com/grbl/grbl/wiki/Configuring-Grbl-v0.9
//
const MODAL_GROUPS = [
    { // Motion Mode (Defaults to G0)
        group: 'motion',
        modes: ['G0', 'G1', 'G2', 'G3', 'G38.2', 'G38.3', 'G38.4', 'G38.5', 'G80']
    },
    { // Coordinate System Select (Defaults to G54)
        group: 'coordinate',
        modes: ['G54', 'G55', 'G56', 'G57', 'G58', 'G59']
    },
    { // Plane Select (Defaults to G17)
        group: 'plane',
        modes: ['G17', 'G18', 'G19']
    },
    { // Units Mode (Defaults to G21)
        group: 'units',
        modes: ['G20', 'G21']
    },
    { // Distance Mode (Defaults to G90)
        group: 'distance',
        modes: ['G90', 'G91']
    },
    { // Feed Rate Mode (Defaults to G94)
        group: 'feedrate',
        modes: ['G93', 'G94']
    },
    { // Program Mode (Defaults to M0)
        group: 'program',
        modes: ['M0', 'M1', 'M2', 'M30']
    },
    { // Spindle State (Defaults to M5)
        group: 'spindle',
        modes: ['M3', 'M4', 'M5']
    },
    { // Coolant State (Defaults to M9)
        group: 'coolant',
        modes: ['M7', 'M8', 'M9']
    }
];

class Grbl extends React.Component {
    state = {
        port: ''
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
        socket.on('grbl:gcode-modes', ::this.socketOnGrblGCodeModes);
    }
    removeSocketEvents() {
        socket.off('grbl:gcode-modes', ::this.socketOnGrblGCodeModes);
    }
    socketOnGrblGCodeModes(data) {
        let modes = data || [];
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

        //log.debug(state);
    }
    write() {
        let port = this.state.port;
        if (!port) {
            return;
        }

        let args = Array.prototype.slice.call(arguments);
        socket.emit.apply(socket, ['serialport:write', port].concat(args));
    }
    writeln() {
        let port = this.state.port;
        if (!port) {
            return;
        }

        let args = Array.prototype.slice.call(arguments);
        socket.emit.apply(socket, ['serialport:writeln', port].concat(args));
    }
    render() {
        let canClick = !!this.state.port;

        return (
            <div>
                <div className="form-group">
                    <div className="btn-group btn-group-justified" role="group" aria-label="...">
                        <DropdownButton bsSize="sm" bsStyle="default" title={i18n._('Real-Time Commands')} id="realtime-commands">
                            <MenuItem onSelect={() => this.write('~')} disabled={!canClick}>{i18n._('Cycle Start (~)')}</MenuItem>
                            <MenuItem onSelect={() => this.write('!')} disabled={!canClick}>{i18n._('Feed Hold (!)')}</MenuItem>
                            <MenuItem onSelect={() => this.write('?')} disabled={!canClick}>{i18n._('Current Status (?)')}</MenuItem>
                            <MenuItem onSelect={() => this.write('\x18')} disabled={!canClick}>{i18n._('Reset Grbl (Ctrl-X)')}</MenuItem>
                        </DropdownButton>
                        <DropdownButton bsSize="sm" bsStyle="default" title={i18n._('System Commands')} id="system-commands">
                            <MenuItem onSelect={() => this.writeln('$#')} disabled={!canClick}>{i18n._('View G-code Parameters ($#)')}</MenuItem>
                            <MenuItem onSelect={() => this.writeln('$G')} disabled={!canClick}>{i18n._('View G-code Parser State ($G)')}</MenuItem>
                            <MenuItem onSelect={() => this.writeln('$I')} disabled={!canClick}>{i18n._('View Build Info ($I)')}</MenuItem>
                            <MenuItem onSelect={() => this.writeln('$N')} disabled={!canClick}>{i18n._('View Startup Blocks ($N)')}</MenuItem>
                            <MenuItem divider />
                            <MenuItem onSelect={() => this.writeln('$C')} disabled={!canClick}>{i18n._('Check G-code Mode ($C)')}</MenuItem>
                            <MenuItem onSelect={() => this.writeln('$X')} disabled={!canClick}>{i18n._('Kill Alarm Lock ($X)')}</MenuItem>
                            <MenuItem onSelect={() => this.writeln('$H')} disabled={!canClick}>{i18n._('Run Homing Cycle ($H)')}</MenuItem>
                        </DropdownButton>
                    </div>
                </div>
            </div>
        );
    }
}

export default class GrblWidget extends React.Component {
    state = {
        isCollapsed: false
    };

    handleClick(target, val) {
        if (target === 'toggle') {
            this.setState({
                isCollapsed: !!val
            });
        }
    }
    render() {
        let width = 360;
        let title = (
            <div><i className="glyphicon glyphicon-wrench"></i>{i18n._('Grbl')}</div>
        );
        let toolbarButtons = [
            'toggle'
        ];
        let widgetContentClass = classNames(
            { 'hidden': this.state.isCollapsed }
        );

        return (
            <div data-component="Widgets/GrblWidget">
                <Widget width={width}>
                    <WidgetHeader
                        title={title}
                        toolbarButtons={toolbarButtons}
                        handleClick={::this.handleClick}
                    />
                    <WidgetContent className={widgetContentClass}>
                        <Grbl />
                    </WidgetContent>
                </Widget>
            </div>
        );
    }
}
