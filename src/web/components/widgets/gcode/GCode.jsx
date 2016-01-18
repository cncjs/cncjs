import _ from 'lodash';
import pubsub from 'pubsub-js';
import React from 'react';
import update from 'react-addons-update';
import { parseText } from 'gcode-parser';
import GCodeStats from './GCodeStats';
import GCodeTable from './GCodeTable';
import log from '../../../lib/log';
import socket from '../../../lib/socket';
import {
    IMPERIAL_UNIT,
    METRIC_UNIT,
    GCODE_STATUS
} from './constants';

class GCode extends React.Component {
    state = {
        port: '',
        unit: METRIC_UNIT,
        commands: [], // a list of gcode commands
        alertMessage: '',

        // Queue Status
        queueStatus: {
            executed: 0,
            total: 0
        }
    };
    socketEventListener = {
        'gcode:queuestatuschange': ::this.socketOnGCodeQueueStatusChange,
        'grbl:parserstate': ::this.socketOnGrblParserState
    };

    componentDidMount() {
        this.subscribe();
        this.addSocketEventListener();
    }
    componentWillUnmount() {
        this.removeSocketEventListener();
        this.unsubscribe();
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

        { // gcode:load
            let token = pubsub.subscribe('gcode:load', (msg, gcode) => {
                gcode = gcode || '';

                parseText(gcode, (err, data) => {
                    if (err) {
                        log.error(err);
                        return;
                    }

                    let commands = _(data)
                        .map((o) => {
                            return {
                                status: GCODE_STATUS.NOT_STARTED,
                                cmd: o.line
                            };
                        })
                        .value();

                    this.setState({ commands: commands });
                });
            });
            this.pubsubTokens.push(token);
        }

        { // gcode:unload
            let token = pubsub.subscribe('gcode:unload', (msg) => {
                let commands = [];
                this.setState({ commands: commands });
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
    socketOnGCodeQueueStatusChange(data) {
        let list = {};
        let from = this.state.queueStatus.executed;
        let to = data.executed;

        // Reset obsolete queue items
        for (let i = to; i < from; ++i) {
            list[i] = {
                status: {
                    $set: GCODE_STATUS.NOT_STARTED
                }
            };
        }

        // Update completed queue items
        for (let i = from; i < to; ++i) {
            list[i] = {
                status: {
                    $set: GCODE_STATUS.COMPLETED
                }
            };
        }

        let updatedCommands = update(this.state.commands, list);
        this.setState({
            commands: updatedCommands,
            queueStatus: {
                executed: Number(data.executed),
                total: Number(data.total)
            }
        });
    }
    socketOnGrblParserState(parserstate) {
        let unit = this.state.unit;

        // Imperial
        if (parserstate.modal.units === 'G20') {
            unit = IMPERIAL_UNIT;
        }

        // Metric
        if (parserstate.modal.units === 'G21') {
            unit = METRIC_UNIT;
        }

        if (this.state.unit !== unit) {
            this.setState({ unit: unit });
        }
    }
    render() {
        let { port, unit, queueStatus } = this.state;
        let tableWidth = this.props.width - 2 /* border */ - 20 /* padding */;
        let tableHeight = 180;
        let rowHeight = 30;
        let visibleRows = Math.floor(tableHeight / rowHeight);
        let isLoaded = (_.size(this.state.commands) > 0);
        let notLoaded = !isLoaded;
        let scrollToRow = Math.min(
            queueStatus.executed + (Math.floor(visibleRows / 2) - 1),
            queueStatus.total
        );

        return (
            <div>
                <GCodeStats
                    unit={unit}
                    executed={queueStatus.executed}
                    total={queueStatus.total}
                />

                {isLoaded &&
                <GCodeTable
                    width={tableWidth}
                    height={tableHeight}
                    rowHeight={rowHeight}
                    data={this.state.commands}
                    scrollToRow={scrollToRow}
                />
                }
            </div>
        );
    }
}

export default GCode;
