import _ from 'lodash';
import i18n from 'i18next';
import pubsub from 'pubsub-js';
import React from 'react';
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
    writeline() {
        let port = this.props.port;
        if (!port) {
            return;
        }

        let args = Array.prototype.slice.call(arguments);
        socket.emit.apply(socket, ['serialport:writeline', port].concat(args));
    }
    handleFeedHold() {
        this.write('!');
    }
    handleCycleStart() {
        this.write('~');
    }
    handleResetGrbl() {
        this.write('\x18');
    }
    handleUnlockGrbl() {
        this.write('$X');
    }
    // To start the spindle turning clockwise at the currently programmed speed, program: M3.
    handleSpindleOnCW(speed) {
        if (_.isNumber(speed)) {
            this.writeline('M3 S' + speed);
        } else {
            this.writeline('M3');
        }
    }
    // To start the spindle turning counterclockwise at the currently programmed speed, program: M4.
    handleSpindleOnCCW(speed) {
        if (_.isNumber(speed)) {
            this.writeline('M4 S' + speed);
        } else {
            this.writeline('M4');
        }
    }
    // To stop the spindle from turning, program: M5.
    handleSpindleOff() {
        this.writeline('M5');
    }
    render() {
        let canClick = !!this.state.port;

        return (
            <div>
                <div className="form-group">
                    <label>{i18n._('Cycle control:')}</label>
                    <div className="btn-group btn-group-justified" role="group" aria-label="...">
                        <div className="btn-group" role="group">
                            <button type="button" className="btn btn-sm btn-danger" onClick={::this.handleFeedHold} disabled={!canClick}>
                                {i18n._('Feed Hold')}
                            </button>
                        </div>
                        <div className="btn-group" role="group">
                            <button type="button" className="btn btn-sm btn-primary" onClick={::this.handleCycleStart} disabled={!canClick}>
                                {i18n._('Cycle Start')}
                            </button>
                        </div>
                    </div>
                </div>
                <div className="form-group">
                    <label>{i18n._('Reset control:')}</label>
                    <div className="btn-group btn-group-justified" role="group" aria-label="...">
                        <div className="btn-group" role="group">
                            <button type="button" className="btn btn-sm btn-default" onClick={::this.handleResetGrbl} disabled={!canClick}>
                                {i18n._('Soft Reset Grbl')}
                            </button>
                        </div>
                        <div className="btn-group" role="group">
                            <button type="button" className="btn btn-sm btn-default" onClick={::this.handleUnlockGrbl} disabled={!canClick}>
                                {i18n._('Unlock Grbl')}
                            </button>
                        </div>
                    </div>
                </div>
                <div className="form-group">
                    <label>{i18n._('Spindle control:')}</label>
                    <div className="btn-group btn-group-justified" role="group" aria-label="...">
                        <div className="btn-group" role="group">
                            <button type="button" className="btn btn-sm btn-default" onClick={::this.handleSpindleOnCW} disabled={!canClick}>
                                {i18n._('On (CW)')}
                            </button>
                        </div>
                        <div className="btn-group" role="group">
                            <button type="button" className="btn btn-sm btn-default" onClick={::this.handleSpindleOnCCW} disabled={!canClick}>
                                {i18n._('On (CCW)')}
                            </button>
                        </div>
                        <div className="btn-group" role="group">
                            <button type="button" className="btn btn-sm btn-default" onClick={::this.handleSpindleOff} disabled={!canClick}>
                                {i18n._('Off')}
                            </button>
                        </div>
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
