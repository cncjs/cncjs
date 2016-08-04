import _ from 'lodash';
import pubsub from 'pubsub-js';
import React from 'react';
import ConsoleInput from './ConsoleInput';
import ConsoleWindow from './ConsoleWindow';
import controller from '../../../lib/controller';
import {
    SCROLL_BUFFER_SIZE
} from './constants';

class Console extends React.Component {
    static propTypes = {
        fullscreen: React.PropTypes.bool
    };

    controllerEvents = {
        'serialport:write': (data) => {
            const lines = data.split('\n');
            const values = _(lines)
                .compact()
                .map((line) => ('> ' + line))
                .value();
            this.appendLine(values);
        },
        'serialport:read': (data) => {
            this.appendLine(data);
        }
    };
    pubsubTokens = [];
    lineBuffers = [];
    throttledTimer = null;

    constructor() {
        super();
        this.state = this.getDefaultState();
    }
    componentDidMount() {
        this.subscribe();
        this.addControllerEvents();

        this.throttledTimer = setInterval(() => {
            if (this.state.lines !== this.lineBuffers) {
                this.setState({ lines: this.lineBuffers });
            }
        }, 500);
    }
    componentWillUnmount() {
        if (this.throttledTimer) {
            clearInterval(this.throttledTimer);
            this.timer = null;
        }
        this.unsubscribe();
        this.removeControllerEvents();
    }
    shouldComponentUpdate(nextProps, nextState) {
        return !_.isEqual(nextProps, this.props) || !_.isEqual(nextState, this.state);
    }
    getDefaultState() {
        return {
            port: controller.port,
            lines: []
        };
    }
    subscribe() {
        const tokens = [
            pubsub.subscribe('port', (msg, port) => {
                port = port || '';

                if (port) {
                    this.setState({ port: port });
                } else {
                    this.clearAll();

                    const defaultState = this.getDefaultState();
                    this.setState({
                        ...defaultState,
                        port: ''
                    });
                }
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
        _.each(this.controllerEvents, (eventHandler, eventName) => {
            controller.on(eventName, eventHandler);
        });
    }
    removeControllerEvents() {
        _.each(this.controllerEvents, (eventHandler, eventName) => {
            controller.off(eventName, eventHandler);
        });
    }
    appendLine(line) {
        this.lineBuffers = _(this.lineBuffers)
            .concat(line)
            .slice(0, SCROLL_BUFFER_SIZE)
            .value();
    }
    clearAll() {
        this.lineBuffers = [];
    }
    render() {
        return (
            <div>
                <ConsoleInput
                    port={this.state.port}
                    onClear={::this.clearAll}
                />
                <ConsoleWindow
                    lines={this.state.lines}
                    fullscreen={this.props.fullscreen}
                />
            </div>
        );
    }
}

export default Console;
