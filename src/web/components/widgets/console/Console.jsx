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
            this.append(values);
        },
        'serialport:read': (data) => {
            this.append(data);
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
        this.unsubscribe();
        this.removeControllerEvents();
    }
    shouldComponentUpdate(nextProps, nextState) {
        return !_.isEqual(nextProps, this.props) || !_.isEqual(nextState, this.state);
    }
    getDefaultState() {
        return {
            port: controller.port,
            buffers: []
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
    append(buffer) {
        const buffers = _(this.state.buffers)
            .concat(buffer)
            .slice(0, SCROLL_BUFFER_SIZE)
            .value();
        this.setState({ buffers: buffers });
    }
    clear() {
        this.setState({ buffers: [] });
    }
    render() {
        return (
            <div>
                <ConsoleInput
                    port={this.state.port}
                    onClear={::this.clear}
                />
                <ConsoleWindow
                    buffers={this.state.buffers}
                    fullscreen={this.props.fullscreen}
                />
            </div>
        );
    }
}

export default Console;
