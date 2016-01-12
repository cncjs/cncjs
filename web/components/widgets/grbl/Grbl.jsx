import _ from 'lodash';
import pubsub from 'pubsub-js';
import React from 'react';
import i18n from '../../../lib/i18n';
import log from '../../../lib/log';
import socket from '../../../lib/socket';
import serialport from '../../../lib/serialport';
import Toolbar from './Toolbar';
import {
    GRBL_MODAL_GROUPS
} from '../../../constants';
import {
    ACTIVE_STATE_IDLE
} from './constants';

const lookupGCodeDefinition = (word) => {
    return {
        // Motion
        'G0': i18n._('Rapid Move'),
        'G1': i18n._('Linear Move'),
        'G2': i18n._('CW Arc'),
        'G3': i18n._('CCW Arc'),
        'G38.2': i18n._('Probing'),
        'G38.3': i18n._('Probing'),
        'G38.4': i18n._('Probing'),
        'G38.5': i18n._('Probing'),
        'G80': i18n._('Cancel Mode'),

        // Work Coordinate System
        'G54': 'G54 (P1)',
        'G55': 'G55 (P2)',
        'G56': 'G56 (P3)',
        'G57': 'G57 (P4)',
        'G58': 'G58 (P5)',
        'G59': 'G59 (P6)',

        // Plane
        'G17': i18n._('XY Plane'),
        'G18': i18n._('XZ Plane'),
        'G19': i18n._('YZ Plane'),

        // Units
        'G20': i18n._('Inches'),
        'G21': i18n._('Millimeters'),

        // Distance
        'G90': i18n._('Absolute'),
        'G91': i18n._('Relative'),

        // Feed Rate
        'G93': i18n._('Inverse Time'),
        'G94': i18n._('Units/Min'),

        // Tool Length Offset
        'G43.1': i18n._('Active Tool Offset'),
        'G49': i18n._('No Tool Offset'),
        
        // Program
        'M0': i18n._('Stop'),
        'M1': i18n._('Stop'),
        'M2': i18n._('End'),
        'M30': i18n._('End'),

        // Spindle
        'M3': i18n._('On (CW)'),
        'M4': i18n._('On (CCW)'),
        'M5': i18n._('Off'),

        // Coolant
        'M7': i18n._('Mist'),
        'M8': i18n._('Flood'),
        'M9': i18n._('Off')
    }[word] || word;
};

class Grbl extends React.Component {
    state = {
        port: '',
        activeState: ACTIVE_STATE_IDLE,
        parserState: {},
        showGCode: false
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
    shouldComponentUpdate(nextProps, nextState) {
        return ! _.isEqual(nextState, this.state);
    }
    subscribe() {
        this.pubsubTokens = [];

        { // port
            let token = pubsub.subscribe('port', (msg, port) => {
                port = port || '';
                this.setState({ port: port });

                if (!port) {
                    let parserState = {};
                    this.setState({ parserState: parserState });
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
    socketOnGrblGCodeModes(words) {
        let parserState = {};

        _.each(words, (word) => {
            // Gx, Mx
            if (word.indexOf('G') === 0 || word.indexOf('M') === 0) {
                let r = _.find(GRBL_MODAL_GROUPS, (group) => {
                    return _.includes(group.modes, word);
                });

                if (r) {
                    _.set(parserState, 'modal.' + r.group, word);
                }
            }

            // T: tool number
            if (word.indexOf('T') === 0) {
                _.set(parserState, 'tool', word.substring(1));
            }

            // F: feed rate
            if (word.indexOf('F') === 0) {
                _.set(parserState, 'feedrate', word.substring(1));
            }

            // S: spindle speed
            if (word.indexOf('S') === 0) {
                _.set(parserState, 'spindle', word.substring(1));
            }
        });

        this.setState({ parserState: parserState });

        log.trace(parserState);
    }
    toggleDisplay() {
        let { showGCode } = this.state;
        this.setState({ showGCode: !showGCode });
    }
    render() {
        let { port, activeState, parserState = {}, showGCode } = this.state;
        let modal = parserState.modal || {};
        let none = '–';
        let canClick = !!port;

        if (!showGCode) {
            modal = _.mapValues(modal, (word, group) => lookupGCodeDefinition(word));
        }

        return (
            <div>
                <Toolbar port={port} />

                <div className="container-fluid parser-state">
                    <div className="row no-gutter">
                        <div className="col col-xs-12">
                            <h6>{i18n._('Parser State')}</h6>
                        </div>
                    </div>
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
                            <div className="well well-xs">{Number(parserState.feedrate) || 0}</div>
                        </div>
                        <div className="col col-xs-3">
                            {i18n._('Spindle')}
                        </div>
                        <div className="col col-xs-3">
                            <div className="well well-xs">{Number(parserState.spindle) || 0}</div>
                        </div>
                    </div>
                    <div className="row no-gutter">
                        <div className="col col-xs-3">
                            {i18n._('Tool Number')}
                        </div>
                        <div className="col col-xs-3">
                            <div className="well well-xs">{parserState.tool || none}</div>
                        </div>
                    </div>
                </div>
                <div className="container-fluid modal-groups">
                    <div className="row no-gutter">
                        <div className="col col-xs-6">
                            <h6 className="modal-groups-header">
                                {i18n._('Modal Groups')}
                            </h6>
                        </div>
                        <div className="col col-xs-6 text-right">
                            <button
                                type="button"
                                className="btn btn-xs btn-default btn-toggle-display"
                                onClick={::this.toggleDisplay}
                                disabled={!canClick}
                            >
                                {i18n._('Toggle Display')}
                            </button>
                        </div>
                    </div>
                    <div className="row no-gutter">
                        <div className="col col-xs-3">
                            {i18n._('Motion')}
                        </div>
                        <div className="col col-xs-3">
                            <div className="well well-xs">{modal.motion || none}</div>
                        </div>
                        <div className="col col-xs-3">
                            {i18n._('WCS')}
                        </div>
                        <div className="col col-xs-3">
                            <div className="well well-xs">{modal.coordinate || none}</div>
                        </div>
                    </div>
                    <div className="row no-gutter">
                        <div className="col col-xs-3">
                            {i18n._('Plane')}
                        </div>
                        <div className="col col-xs-3">
                            <div className="well well-xs">{modal.plane || none}</div>
                        </div>
                        <div className="col col-xs-3">
                            {i18n._('Distance')}
                        </div>
                        <div className="col col-xs-3">
                            <div className="well well-xs">{modal.distance || none}</div>
                        </div>
                    </div>
                    <div className="row no-gutter">
                        <div className="col col-xs-3">
                            {i18n._('Feed Rate')}
                        </div>
                        <div className="col col-xs-3">
                            <div className="well well-xs">{modal.feedrate || none}</div>
                        </div>
                        <div className="col col-xs-3">
                            {i18n._('Units')}
                        </div>
                        <div className="col col-xs-3">
                            <div className="well well-xs">{modal.units || none}</div>
                        </div>
                    </div>
                    <div className="row no-gutter">
                        <div className="col col-xs-3">
                            {i18n._('Program')}
                        </div>
                        <div className="col col-xs-3">
                            <div className="well well-xs">{modal.program || none}</div>
                        </div>
                        <div className="col col-xs-3">
                            {i18n._('Spindle')}
                        </div>
                        <div className="col col-xs-3">
                            <div className="well well-xs">{modal.spindle || none}</div>
                        </div>
                    </div>
                    <div className="row no-gutter">
                        <div className="col col-xs-3">
                            {i18n._('Coolant')}
                        </div>
                        <div className="col col-xs-3">
                            <div className="well well-xs">{modal.coolant || none}</div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default Grbl;
