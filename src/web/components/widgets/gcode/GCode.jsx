import _ from 'lodash';
import pubsub from 'pubsub-js';
import React from 'react';
import update from 'react-addons-update';
import { parseText } from 'gcode-parser';
import GCodeStats from './GCodeStats';
import GCodeTable from './GCodeTable';
import controller from '../../../lib/controller';
import log from '../../../lib/log';
import {
    IMPERIAL_UNIT,
    METRIC_UNIT,
    GCODE_STATUS
} from './constants';

class GCode extends React.Component {
    state = {
        port: '',
        unit: METRIC_UNIT,
        lines: [], // List of G-code lines
        alertMessage: '',

        // G-code Status
        remain: 0,
        sent: 0,
        total: 0,
        createdTime: 0,
        startedTime: 0,
        finishedTime: 0
    };
    controllerEvents = {
        'gcode:statuschange': (data) => {
            const { remain, sent, total, createdTime, startedTime, finishedTime } = data;
            const from = this.state.sent;
            const to = sent;

            let list = {};

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

            const lines = update(this.state.lines, list);
            this.setState({
                lines,
                remain,
                sent,
                total,
                createdTime,
                startedTime,
                finishedTime
            });
        },
        'grbl:parserstate': (parserstate) => {
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
    };

    componentDidMount() {
        this.subscribe();
        this.addControllerEvents();
    }
    componentWillUnmount() {
        this.removeControllerEvents();
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

                    const lines = _(data)
                        .map((o, index) => {
                            return {
                                id: index,
                                status: GCODE_STATUS.NOT_STARTED,
                                cmd: o.line
                            };
                        })
                        .value();

                    this.setState({ lines: lines });
                });
            });
            this.pubsubTokens.push(token);
        }

        { // gcode:unload
            let token = pubsub.subscribe('gcode:unload', (msg) => {
                this.setState({ lines: [] });
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
    addControllerEvents() {
        _.each(this.controllerEvents, (callback, eventName) => {
            controller.on(eventName, callback);
        });
    }
    removeControllerEvents() {
        _.each(this.controllerEvents, (callback, eventName) => {
            controller.off(eventName, callback);
        });
    }
    render() {
        const { unit, lines } = this.state;
        const { remain, sent, total, createdTime, startedTime, finishedTime } = this.state;
        const isLoaded = (_.size(lines) > 0);
        const notLoaded = !isLoaded;
        const scrollTo = sent;

        return (
            <div>
                <GCodeStats
                    unit={unit}
                    remain={remain}
                    sent={sent}
                    total={total}
                    createdTime={createdTime}
                    startedTime={startedTime}
                    finishedTime={finishedTime}
                />

                {isLoaded &&
                <GCodeTable
                    data={this.state.lines}
                    scrollTo={scrollTo}
                />
                }
            </div>
        );
    }
}

export default GCode;
