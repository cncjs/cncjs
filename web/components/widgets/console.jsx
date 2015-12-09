import _ from 'lodash';
import log from '../../lib/log';
import i18n from 'i18next';
import pubsub from 'pubsub-js';
import React from 'react';
import ReactDOM from 'react-dom';
import Infinite from 'react-infinite';
import classNames from 'classnames';
import { Widget, WidgetHeader, WidgetContent } from '../widget';
import serialport from '../../lib/serialport';
import './console.css';
import { DropdownButton, MenuItem } from 'react-bootstrap';

const SCROLL_BUFFER_SIZE = 5000; // lines
const GRBL_REALTIME_COMMANDS = [
    '~', // Cycle Start
    '!', // Feed Hold
    '?', // Current Status
    '\x18' // Reset Grbl (Ctrl-X)
];

class ConsoleInput extends React.Component {
    static propTypes = {
        port: React.PropTypes.string,
        onClear: React.PropTypes.func
    };

    handleKeyDown(e) {
        let ENTER = 13;
        if (e.keyCode === ENTER) {
            this.handleSend();
        }
    }
    handleSend() {
        let el = ReactDOM.findDOMNode(this.refs.command);

        if (el.value === '') {
            return;
        }

        if (_.includes(GRBL_REALTIME_COMMANDS, el.value)) {
            serialport.write(el.value);
        } else {
            serialport.writeln(el.value);
        }

        el.value = '';
    }
    handleClear() {
        this.props.onClear();
    }
    render() {
        let { port } = this.props;
        let canInput = !!port;
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
                        </DropdownButton>
                    </div>
                </div>
            </div>
        );
    }
}

class ConsoleWindow extends React.Component {
    static propTypes = {
        buffers: React.PropTypes.array
    };

    // Scroll Position with React
    // http://blog.vjeux.com/2013/javascript/scroll-position-with-react.html
    componentWillUpdate() {
        let node = ReactDOM.findDOMNode(this.refs.infinite);
        let hScrollBarHeight = (node.scrollWidth != node.clientWidth) ? 20 : 0;
        this.shouldScrollBottom = ((node.scrollTop + node.clientHeight + hScrollBarHeight) >= node.scrollHeight);
    }
    componentDidUpdate() {
        let node = ReactDOM.findDOMNode(this.refs.infinite);
        if (this.shouldScrollBottom) {
            node.scrollTop = node.scrollHeight;
        }
    }
    buildElements(buffers) {
        return _.map(buffers, (msg, index) => {
            return (
                <div key={index} className="infinite-list-item">{msg}</div>
            );
        });
    }
    render() {
        let { buffers } = this.props;
        let elements = this.buildElements(buffers);

        return (
            <div className="console-window code">
                <Infinite
                    containerHeight={260}
                    elementHeight={20}
                    ref="infinite"
                >
                    {elements}
                </Infinite>
            </div>
        );
    }
}

class Console extends React.Component {
    state = {
        port: '',
        buffers: []
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
        let that = this;

        this.pubsubTokens = [];

        { // port
            let token = pubsub.subscribe('port', (msg, port) => {
                port = port || '';
                that.setState({ port: port });

                if (!port) {
                    that.clear();
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
        serialport.on('write', ::this.onSerialPortWrite);
        serialport.on('data', ::this.onSerialPortRead);
    }
    removeSocketEvents() {
        serialport.off('write', ::this.onSerialPortWrite);
        serialport.off('data', ::this.onSerialPortRead);
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

class ConsoleWidget extends React.Component {
    state = {
        isCollapsed: false
    };

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
                        <Console />
                    </WidgetContent>
                </Widget>
            </div>
        );
    }
}

export default ConsoleWidget;
