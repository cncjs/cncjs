import _ from 'lodash';
import classNames from 'classnames';
import pubsub from 'pubsub-js';
import React from 'react';
import ConsoleInput from './ConsoleInput';
import ConsoleWindow from './ConsoleWindow';
import serialport from '../../../lib/serialport';
import {
    SCROLL_BUFFER_SIZE
} from './constants';

class Console extends React.Component {
    state = {
        port: '',
        buffers: []
    };
    socketEvents = {
        'write': ::this.onSerialPortWrite,
        'read': ::this.onSerialPortRead
    };

    buffers = [];

    componentDidMount() {
        this.subscribe();
        this.addSerialPortEvents();
    }
    componentWillUnmount() {
        this.unsubscribe();
        this.removeSerialPortEvents();
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
    addSerialPortEvents() {
        _.each(this.socketEvents, (eventHandler, eventName) => {
            serialport.on(eventName, eventHandler);
        });
    }
    removeSocketEvents() {
        _.each(this.socketEvents, (eventHandler, eventName) => {
            serialport.off(eventName, eventHandler);
        });
    }
    onSerialPortRead(data) {
        this.append(data);
    }
    onSerialPortWrite(data) {
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
