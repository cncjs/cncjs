import _ from 'lodash';
import log from '../../lib/log';
import i18n from 'i18next';
import React from 'react';
import Infinite from 'react-infinite';
import classNames from 'classnames';
import Widget, { WidgetHeader, WidgetContent } from '../widget';
import socket from '../../socket';
import store from '../../store';
import './console.css';
import { DropdownButton, MenuItem } from 'react-bootstrap';

const MESSAGE_LIMIT = 5000;

class ConsoleInput extends React.Component {
    state = {
        port: ''
    };

    componentDidMount() {
        this.subscribeToEvents();
    }
    componentWillUnmount() {
        this.unsubscribeFromEvents();
    }
    subscribeToEvents() {
        let that = this;

        this.unsubscribe = store.subscribe(() => {
            let port = _.get(store.getState(), 'port');
            that.setState({ port: port });
        });
    }
    unsubscribeFromEvents() {
        this.unsubscribe();
    }
    handleSend() {
        let el = React.findDOMNode(this.refs.command);
        this.props.onSend(el.value);

        socket.emit('serialport:writeline', this.state.port, el.value);

        el.value = '';
    }
    handleClear() {
        this.props.onClear();
    }
    render() {
        let canInput = !! this.state.port;
        let canSend = canInput;
        let canClearAll = canInput;

        return (
            <div className="console-input">
                <div className="form-inline">
                    <div className="form-group">
                        <div className="input-group input-group-sm">
                            <input type="text" className="form-control" ref="command" placeholder={i18n._('Type serial port command')} disabled={! canInput} />
                            <div className="input-group-btn">
                                <button type="button" className="btn btn-default" onClick={::this.handleSend} disabled={! canSend}>{i18n._('Send')}</button>
                                <DropdownButton bsSize="sm" title="" id="console-command-dropdown" pullRight>
                                    <MenuItem onSelect={::this.handleClear} disabled={! canClearAll}>{i18n._('Clear all')}</MenuItem>
                                </DropdownButton>
                            </div>
                        </div>
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
        let width = 300;
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
            <Widget width={width}>
                <WidgetHeader
                    title={title}
                    toolbarButtons={toolbarButtons}
                    handleClick={::this.handleClick}
                />
                <WidgetContent className={widgetContentClass}>
                    <div data-component="Widgets/ConsoleWidget">
                        <ConsoleInput onSend={::this.sendMessage} onClear={::this.clearMessages} />
                        <ConsoleWindow messages={this.state.messages} />
                    </div>
                </WidgetContent>
            </Widget>
        );
    }
}
