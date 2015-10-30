import _ from 'lodash';
import log from '../../lib/log';
import i18n from 'i18next';
import pubsub from 'pubsub-js';
import React from 'react';
import Infinite from 'react-infinite';
import classNames from 'classnames';
import Widget, { WidgetHeader, WidgetContent } from '../widget';
import socket from '../../socket';
import './console.css';
import { DropdownButton, MenuItem } from 'react-bootstrap';

const MESSAGE_LIMIT = 5000;

class ConsoleInput extends React.Component {
    state = {
        port: ''
    };

    componentDidMount() {
        this.subscribe();
    }
    componentWillUnmount() {
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
    }
    unsubscribe() {
        _.each(this.pubsubTokens, (token) => {
            pubsub.unsubscribe(token);
        });
        this.pubsubTokens = [];
    }
    handleKeyDown(e) {
        let ENTER = 13;
        if (e.keyCode === ENTER) {
            this.handleSend();
        }
    }
    handleSend() {
        let el = React.findDOMNode(this.refs.command);
        this.props.onSend('> ' + el.value);

        socket.emit('serialport:writeline', this.state.port, el.value);

        el.value = '';
    }
    handleClear() {
        this.props.onClear();
    }
    handleGrblHelp() {
        this.props.onSend('> $');
        socket.emit('serialport:writeline', this.state.port, '$');
    }
    handleGrblSettings() {
        this.props.onSend('> $$');
        socket.emit('serialport:writeline', this.state.port, '$$');
    }
    render() {
        let canInput = !!(this.state.port);
        let canSend = canInput;
        let canClearAll = canInput;
        let canViewGrblHelp = canInput;
        let canViewGrblSettings = canInput;

        return (
            <div className="console-input">
                <div className="input-group input-group-sm">
                    <input
                        type="text"
                        className="form-control"
                        onKeyDown={::this.handleKeyDown}
                        ref="command"
                        placeholder={i18n._('Type serial port command')}
                        disabled={!canInput}
                    />
                    <div className="input-group-btn">
                        <button
                            type="button"
                            className="btn btn-default"
                            onClick={::this.handleSend}
                            disabled={!canSend}
                        >
                            {i18n._('Send')}
                        </button>
                        <DropdownButton bsSize="sm" title="" id="console-command-dropdown" pullRight>
                            <MenuItem onSelect={::this.handleClear} disabled={!canClearAll}>{i18n._('Clear all')}</MenuItem>
                            <MenuItem onSelect={::this.handleGrblHelp} disabled={!canViewGrblHelp}>{i18n._('Grbl Help ($)')}</MenuItem>
                            <MenuItem onSelect={::this.handleGrblSettings} disabled={!canViewGrblSettings}>{i18n._('Grbl Settings ($$)')}</MenuItem>
                        </DropdownButton>
                    </div>
                </div>
            </div>
        );
    }
}

class ConsoleWindow extends React.Component {
    // Scroll Position with React
    // http://blog.vjeux.com/2013/javascript/scroll-position-with-react.html
    componentWillUpdate() {
        let node = React.findDOMNode(this.refs.infinite);
        let hScrollBarHeight = (node.scrollWidth != node.clientWidth) ? 20 : 0;
        this.shouldScrollBottom = ((node.scrollTop + node.clientHeight + hScrollBarHeight) >= node.scrollHeight);
    }
    componentDidUpdate() {
        let node = React.findDOMNode(this.refs.infinite);
        if (this.shouldScrollBottom) {
            node.scrollTop = node.scrollHeight;
        }
    }
    buildElements() {
        return _.map(this.props.messages, function(msg, index) {
            return (
                <div key={index} className="infinite-list-item">{msg}</div>
            );
        });
    }
    render() {
        return (
            <div className="console-window code">
                <Infinite containerHeight={260} elementHeight={20} ref="infinite">
                {this.buildElements()}
                </Infinite>
            </div>
        );
    }
}

export default class ConsoleWidget extends React.Component {
    state = {
        isCollapsed: false,
        port: '',
        messages: []
    };

    componentDidMount() {
        this.addSocketEvents();
    }
    componentWillUnmount() {
        this.removeSocketEvents();
    }
    addSocketEvents() {
        socket.on('serialport:readline', ::this.socketOnSerialPortReadLine);
    }
    removeSocketEvents() {
        socket.off('serialport:readline', ::this.socketOnSerialPortReadLine);
    }
    socketOnSerialPortReadLine(line) {
        this.sendMessage(line);
    }
    sendMessage(message) {
        this.setState({
            messages: this.state.messages.concat(message).slice(0, MESSAGE_LIMIT)
        });
    }
    clearMessages() {
        this.setState({
            messages: []
        });
    }
    handleClick(target, val) {
        if (target === 'toggle') {
            this.setState({
                isCollapsed: !!val
            });
        }
    }
    render() {
        let width = 360;
        let title = (
            <div><i className="glyphicon glyphicon-console"></i>{i18n._('Console')}</div>
        );
        let toolbarButtons = [
            'toggle'
        ];
        let widgetContentClass = classNames(
            { 'hidden': this.state.isCollapsed }
        );

        return (
            <div data-component="Widgets/ConsoleWidget">
                <Widget width={width}>
                    <WidgetHeader
                        title={title}
                        toolbarButtons={toolbarButtons}
                        handleClick={::this.handleClick}
                    />
                    <WidgetContent className={widgetContentClass}>
                        <ConsoleInput onSend={::this.sendMessage} onClear={::this.clearMessages} />
                        <ConsoleWindow messages={this.state.messages} />
                    </WidgetContent>
                </Widget>
            </div>
        );
    }
}
