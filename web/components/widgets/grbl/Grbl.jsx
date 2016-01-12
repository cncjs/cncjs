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
        'G54': 'G54',
        'G55': 'G55',
        'G56': 'G56',
        'G57': 'G57',
        'G58': 'G58',
        'G59': 'G59',

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
        'G93': i18n._('Inverse'),
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
        parserState: {}
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
    render() {
        let { port, activeState, parserState = {} } = this.state;
        let modal = _.mapValues(parserState.modal, (word, group) => lookupGCodeDefinition(word));
        let canClick = !!port;

        return (
            <div>
                <Toolbar port={port} />

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
                            <div className="well well-xs">{parserState.feedrate}</div>
                        </div>
                        <div className="col col-xs-3">
                            {i18n._('Spindle')}
                        </div>
                        <div className="col col-xs-3">
                            <div className="well well-xs">{parserState.spindle}</div>
                        </div>
                    </div>
                    <div className="row no-gutter">
                        <div className="col col-xs-3">
                            {i18n._('Tool Number')}
                        </div>
                        <div className="col col-xs-3">
                            <div className="well well-xs">{parserState.tool}</div>
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
                            <div className="well well-xs">{modal.motion}</div>
                        </div>
                        <div className="col col-xs-3">
                            {i18n._('WCS')}
                        </div>
                        <div className="col col-xs-3">
                            <div className="well well-xs">{modal.coordinate}</div>
                        </div>
                    </div>
                    <div className="row no-gutter">
                        <div className="col col-xs-3">
                            {i18n._('Plane')}
                        </div>
                        <div className="col col-xs-3">
                            <div className="well well-xs">{modal.plane}</div>
                        </div>
                        <div className="col col-xs-3">
                            {i18n._('Distance')}
                        </div>
                        <div className="col col-xs-3">
                            <div className="well well-xs">{modal.distance}</div>
                        </div>
                    </div>
                    <div className="row no-gutter">
                        <div className="col col-xs-3">
                            {i18n._('Feed Rate')}
                        </div>
                        <div className="col col-xs-3">
                            <div className="well well-xs">{modal.feedrate}</div>
                        </div>
                        <div className="col col-xs-3">
                            {i18n._('Units')}
                        </div>
                        <div className="col col-xs-3">
                            <div className="well well-xs">{modal.units}</div>
                        </div>
                    </div>
                    <div className="row no-gutter">
                        <div className="col col-xs-3">
                            {i18n._('Program')}
                        </div>
                        <div className="col col-xs-3">
                            <div className="well well-xs">{modal.program}</div>
                        </div>
                        <div className="col col-xs-3">
                            {i18n._('Spindle')}
                        </div>
                        <div className="col col-xs-3">
                            <div className="well well-xs">{modal.spindle}</div>
                        </div>
                    </div>
                    <div className="row no-gutter">
                        <div className="col col-xs-3">
                            {i18n._('Coolant')}
                        </div>
                        <div className="col col-xs-3">
                            <div className="well well-xs">{modal.coolant}</div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default Grbl;
