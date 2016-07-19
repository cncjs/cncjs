import _ from 'lodash';
import pubsub from 'pubsub-js';
import React from 'react';
import update from 'react-addons-update';
import { parseString } from 'gcode-parser';
import controller from '../../../lib/controller';
import log from '../../../lib/log';
import GCodeStats from './GCodeStats';
import GCodeTable from './GCodeTable';
import {
    IMPERIAL_UNITS,
    METRIC_UNITS
} from '../../../constants';
import {
    GCODE_STATUS_NOT_STARTED,
    GCODE_STATUS_COMPLETED
} from './constants';

class GCode extends React.Component {
    controllerEvents = {
        'gcode:statuschange': (data) => {
            const { remain, sent, total, createdTime, startedTime, finishedTime } = data;

            let lines = this.state.lines;
            if (this.state.lines.length > 0) {
                const from = this.state.sent;
                const to = sent;
                let list = {};

                // Reset obsolete queue items
                for (let i = to; i < from; ++i) {
                    list[i] = {
                        status: {
                            $set: GCODE_STATUS_NOT_STARTED
                        }
                    };
                }

                // Update completed queue items
                for (let i = from; i < to; ++i) {
                    list[i] = {
                        status: {
                            $set: GCODE_STATUS_COMPLETED
                        }
                    };
                }

                lines = update(this.state.lines, list);
            }

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
        'Grbl:state': (state) => {
            const { parserstate } = { ...state };
            let units = this.state.units;

            // Imperial
            if (parserstate.modal.units === 'G20') {
                units = IMPERIAL_UNITS;
            }

            // Metric
            if (parserstate.modal.units === 'G21') {
                units = METRIC_UNITS;
            }

            if (this.state.units !== units) {
                this.setState({ units: units });
            }
        },
        'TinyG2:state': (state) => { // TODO
        }
    };
    pubsubTokens = [];

    constructor() {
        super();
        this.state = this.getDefaultState();
    }
    componentDidMount() {
        this.subscribe();
        this.addControllerEvents();
    }
    componentWillUnmount() {
        this.removeControllerEvents();
        this.unsubscribe();
    }
    shouldComponentUpdate(nextProps, nextState) {
        return !_.isEqual(nextProps, this.props) || !_.isEqual(nextState, this.state);
    }
    getDefaultState() {
        return {
            port: controller.port,
            units: METRIC_UNITS,
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
    }
    subscribe() {
        const tokens = [
            pubsub.subscribe('port', (msg, port) => {
                port = port || '';

                if (port) {
                    this.setState({ port: port });
                } else {
                    const defaultState = this.getDefaultState();
                    this.setState({
                        ...defaultState,
                        port: ''
                    });
                }
            }),
            pubsub.subscribe('gcode:load', (msg, gcode) => {
                gcode = gcode || '';

                parseString(gcode, (err, data) => {
                    if (err) {
                        log.error(err);
                        return;
                    }

                    const lines = _(data)
                        .map((o, index) => ({
                            id: index,
                            status: GCODE_STATUS_NOT_STARTED,
                            cmd: o.line
                        }))
                        .value();

                    this.setState({ lines });
                });
            }),
            pubsub.subscribe('gcode:unload', (msg) => {
                this.setState({ lines: [] });
            })
        ];
        this.pubsubTokens = this.pubsubTokens.concat(tokens);
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
        const { units, lines } = this.state;
        const { remain, sent, total, createdTime, startedTime, finishedTime } = this.state;
        const isLoaded = (_.size(lines) > 0);
        const scrollToRow = sent;

        return (
            <div>
                <GCodeStats
                    units={units}
                    remain={remain}
                    sent={sent}
                    total={total}
                    createdTime={createdTime}
                    startedTime={startedTime}
                    finishedTime={finishedTime}
                />

            {isLoaded &&
                <GCodeTable
                    rows={lines}
                    scrollToRow={scrollToRow}
                />
            }
            </div>
        );
    }
}

export default GCode;
