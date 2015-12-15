import _ from 'lodash';
import pubsub from 'pubsub-js';
import React from 'react';
import update from 'react-addons-update';
import GCodeStats from './GCodeStats';
import GCodeTable from './GCodeTable';
import socket from '../../../lib/socket';

class GCode extends React.Component {
    state = {
        port: '',
        commands: [], // a list of gcode commands
        alertMessage: '',

        // Queue Status
        queueStatus: {
            executed: 0,
            total: 0
        }
    };

    componentDidMount() {
        this.subscribe();
        this.addSocketEvents();
    }
    componentWillUnmount() {
        this.removeSocketEvents();
        this.unsubscribe();
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

        { // gcode:data
            let token = pubsub.subscribe('gcode:data', (msg, gcode) => {
                gcode = gcode || '';
                let lines = gcode.split('\n');
                let commands = _(lines)
                    .map(function(line) {
                        return stripComments(line);
                    })
                    .compact()
                    .map(function(line) {
                        return {
                            status: GCODE_STATUS.NOT_STARTED,
                            cmd: line
                        };
                    })
                    .value();
                that.setState({ commands: commands });
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
        socket.on('gcode:queue-status', ::this.socketOnGCodeQueueStatus);
    }
    removeSocketEvents() {
        socket.off('gcode:queue-status', ::this.socketOnGCodeQueueStatus);
    }
    socketOnGCodeQueueStatus(data) {
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

    render() {
        let tableWidth = this.props.width - 2 /* border */ - 20 /* padding */;
        let tableHeight = 180;
        let rowHeight = 30;
        let visibleRows = Math.floor(tableHeight / rowHeight);
        let isLoaded = (_.size(this.state.commands) > 0);
        let notLoaded = !isLoaded;
        let scrollToRow = Math.min(
            this.state.queueStatus.executed + (Math.floor(visibleRows / 2) - 1),
            this.state.queueStatus.total
        );

        return (
            <div>
                <GCodeStats
                    executed={this.state.queueStatus.executed}
                    total={this.state.queueStatus.total}
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
