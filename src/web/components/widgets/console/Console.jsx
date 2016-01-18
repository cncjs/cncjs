import _ from 'lodash';
import classNames from 'classnames';
import pubsub from 'pubsub-js';
import React from 'react';
import ConsoleInput from './ConsoleInput';
import ConsoleWindow from './ConsoleWindow';
import controller from '../../../lib/controller';
import {
    SCROLL_BUFFER_SIZE
} from './constants';

class Console extends React.Component {
    state = {
        port: '',
        buffers: []
    };
    controllerEvents = {
        'write': ::this.onControllerWrite,
        'read': ::this.onControllerRead
    };

    buffers = [];

    componentDidMount() {
        this.subscribe();
        this.addControllerEvents();
    }
    componentWillUnmount() {
        this.unsubscribe();
        this.removeControllerEvents();
    }
    subscribe() {
        this.pubsubTokens = [];

        { // port
            let token = pubsub.subscribe('port', (msg, port) => {
                port = port || '';
                this.setState({ port: port });

                if (!port) {
                    this.clear();
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
    onControllerRead(data) {
        this.append(data);
    }
    onControllerWrite(data) {
        let lines = data.split('\n');
        let values = _(lines)
            .compact()
            .map((line) => ('> ' + line))
            .value();

        this.append(values);
    }
    append(buffer) {
        this.buffers = _(this.buffers)
            .concat(buffer)
            .slice(0, SCROLL_BUFFER_SIZE)
            .value();
        this.setState({ buffers: this.buffers });
    }
    clear() {
        this.buffers = [];
        this.setState({ buffers: this.buffers });
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
                />
            </div>
        );
    }
}

export default Console;
