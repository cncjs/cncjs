import _ from 'lodash';
import i18n from 'i18next';
import pubsub from 'pubsub-js';
import React from 'react';
import Select from 'react-select';
import classNames from 'classnames';
import Widget, { WidgetHeader, WidgetContent } from '../widget';
import log from '../../lib/log';
import socket from '../../socket';
import './connection.css';

class Alert extends React.Component {
    render() {
        return (
            <div>
                {this.props.msg &&
                <div className="alert alert-danger fade in" style={{padding: '4px'}}>
                    <a
                        href="javascript:void(0)"
                        className="close"
                        data-dismiss="alert"
                        aria-label="close"
                        style={{fontSize: '16px'}}
                        onClick={this.props.dismiss}
                    >×</a>
                    {this.props.msg}
                </div>
                }
            </div>
        );
    }
}

class Connection extends React.Component {
    state = {
        loading: false,
        ports: [],
        baudrates: [
            9600,
            19200,
            38400,
            57600,
            115200
        ],
        port: '',
        baudrate: 115200,
        alertMessage: ''
    };

    componentWillMount() {
        this.handleRefresh();
    }
    componentDidMount() {
        this.addSocketEvents();
    }
    componentWillUnmount() {
        this.removeSocketEvents();
    }
    addSocketEvents() {
        socket.on('serialport:list', ::this.socketOnSerialPortList);
        socket.on('serialport:open', ::this.socketOnSerialPortOpen);
        socket.on('serialport:close', ::this.socketOnSerialPortClose);
        socket.on('serialport:error', ::this.socketOnSerialPortError);
    }
    removeSocketEvents() {
        socket.off('serialport:list', ::this.socketOnSerialPortList);
        socket.off('serialport:open', ::this.socketOnSerialPortOpen);
        socket.off('serialport:close', ::this.socketOnSerialPortClose);
        socket.off('serialport:error', ::this.socketOnSerialPortError);
    }
    socketOnSerialPortList(ports) {
        log.debug('serialport:list', ports);

        this.stopLoading();

        this.clearAlert();

        this.setState({
            ports: ports
        });
    }
    socketOnSerialPortOpen(options) {
        let { port, baudrate, inuse } = options;
        let ports = _.map(this.state.ports, function(o) {
            if (o.port !== port) {
                return o;
            }

            return _.extend(o, { inuse: inuse });
        });

        this.clearAlert();

        pubsub.publish('port', port);

        this.setState({
            connecting: false,
            connected: true,
            port: port,
            baudrate: baudrate,
            ports: ports
        });

        log.debug('Connected to \'' + port + '\' at ' + baudrate + '.');
    }
    socketOnSerialPortClose(options) {
        let { port, inuse } = options;

        this.clearAlert();

        // Close port
        pubsub.publish('port', '');

        this.setState({
            connecting: false,
            connected: false
        });

        log.debug('Disconnected from \'' + port + '\'.');
    }
    socketOnSerialPortError(options) {
        let { port } = options;

        this.showAlert('Error opening serial port: ' + port);

        // Close port
        pubsub.publish('port', '');

        this.setState({
            connecting: false,
            connected: false
        });

        log.error('Error opening serial port:', port);
    }
    showAlert(msg) {
        this.setState({ alertMessage: msg });
    }
    clearAlert() {
        this.setState({ alertMessage: '' });
    }
    startLoading() {
        let that = this;
        let delay = 5 * 1000; // wait for 5 seconds

        this.setState({
            loading: true
        });
        this._loadingTimer = setTimeout(function() {
            that.setState({ loading: false });
        }, delay);
    }
    stopLoading() {
        if (this._loadingTimer) {
            clearTimeout(this._loadingTimer);
            this._loadingTimer = null;
        }
        this.setState({
            loading: false
        });
    }
    isPortInUse(port) {
        port = port || this.state.port;
        let o = _.findWhere(this.state.ports, { port: port }) || {};
        return !! o.inuse;
    }
    handleRefresh() {
        socket.emit('list');
        this.startLoading();
    }
    openPort() {
        let port = this.state.port;
        let baudrate = this.state.baudrate;

        this.setState({
            connecting: true
        });
        socket.emit('open', {
            port: port,
            baudrate: baudrate
        });
    }
    closePort() {
        let port = this.state.port;

        // Close port
        pubsub.publish('port', '');

        this.setState({
            connecting: false,
            connected: false
        });
        socket.emit('close', {
            port: port
        });

        // Refresh ports
        socket.emit('list');
    }
    changePort(value) {
        this.setState({
            alertMessage: '',
            port: value
        });
    }
    changeBaudrate(value) {
        this.setState({
            alertMessage: '',
            baudrate: value
        });
    }
    renderPortOption(option) {
        let optionStyle = {
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            overflow: 'hidden'
        };
        let noteStyle = {
            fontSize: '12px'
        };

        return (
            <div style={optionStyle} title={option.label}>
                <div>
                {option.inuse &&
                    <span><i className="icon ion-locked"></i>&nbsp;</span>
                }
                {option.label}
                </div>
                {option.manufacturer && 
                    <note style={noteStyle}>
                        {i18n._('Manufacturer:')}&nbsp;{option.manufacturer}
                    </note>
                }
            </div>
        );
    }
    renderPortValue(option) {
        let notLoading = ! this.state.loading;
        let canChangePort = notLoading;
        let style = {
            color: canChangePort ? '#333' : '#ccc',
            textOverflow: 'ellipsis',
            overflow: 'hidden'
        };
        return (
            <div style={style} title={option.label}>
                {option.inuse &&
                    <span><i className="icon ion-locked"></i>&nbsp;</span>
                }
                {option.label}
            </div>
        );
    }
    renderBaudrateValue(option) {
        let notLoading = ! this.state.loading;
        let notInUse = ! this.isPortInUse(this.state.port);
        let canChangeBaudrate = notLoading && notInUse;
        let style = {
            color: canChangeBaudrate ? '#333' : '#ccc',
            textOverflow: 'ellipsis',
            overflow: 'hidden'
        };
        return (
            <div style={style} title={option.label}>{option.label}</div>
        );
    }
    render() {
        let notLoading = ! this.state.loading;
        let notConnecting = ! this.state.connecting;
        let notConnected = ! this.state.connected;
        let isConnected = this.state.connected;
        let canRefresh = notLoading && notConnected;
        let canChangePort = notLoading && notConnected;
        let canChangeBaudrate = notLoading && notConnected && (! this.isPortInUse(this.state.port));
        let canOpenPort = this.state.port && this.state.baudrate && notConnecting && notConnected;
        let canClosePort = isConnected;

        return (
            <div>
                <Alert msg={this.state.alertMessage} dismiss={::this.clearAlert} />
                <div className="form-group">
                    <label className="control-label">{i18n._('Port:')}</label>
                    <div className="input-group input-group-sm">
                        <Select
                            name="port"
                            value={this.state.port}
                            options={_.map(this.state.ports, function(port) {
                                return {
                                    value: port.port,
                                    label: port.port,
                                    manufacturer: port.manufacturer,
                                    inuse: port.inuse
                                };
                            })}
                            disabled={! canChangePort}
                            backspaceRemoves={false}
                            clearable={false}
                            searchable={false}
                            placeholder={i18n._('Choose a port')}
                            noResultsText={i18n._('No ports available')}
                            optionRenderer={::this.renderPortOption}
                            valueRenderer={::this.renderPortValue}
                            onChange={::this.changePort}
                        />
                        <div className="input-group-btn">
                            <button type="button" className="btn btn-default" name="btn-refresh" title={i18n._('Refresh')} onClick={::this.handleRefresh} disabled={! canRefresh}>
                            {notLoading
                                ? <i className="glyphicon glyphicon-refresh"></i>
                                : <i className="glyphicon glyphicon-refresh rotating"></i>
                            }
                            </button>
                        </div>
                    </div>
                </div>
                <div className="form-group">
                    <label className="control-label">{i18n._('Baud rate:')}</label>
                    <Select
                        name="baudrate"
                        value={this.state.baudrate}
                        options={_.map(this.state.baudrates, function(baudrate) {
                            return {
                                value: baudrate,
                                label: Number(baudrate).toString()
                            };
                        })}
                        disabled={! canChangeBaudrate}
                        backspaceRemoves={false}
                        clearable={false}
                        searchable={false}
                        placeholder={i18n._('Choose a baud rate')}
                        valueRenderer={::this.renderBaudrateValue}
                        onChange={::this.changeBaudrate}
                    />
                </div>
                <div className="btn-group btn-group-sm">
                    {notConnected &&
                        <button
                            type="button"
                            className="btn btn-default"
                            disabled={! canOpenPort}
                            onClick={::this.openPort}
                        >
                            <i className="icon ion-power"></i>&nbsp;{i18n._('Open')}
                        </button>
                    }
                    {isConnected &&
                        <button
                            type="button"
                            className="btn btn-danger"
                            disabled={! canClosePort}
                            onClick={::this.closePort}
                        >
                            <i className="icon ion-close"></i>&nbsp;{i18n._('Close')}
                        </button>
                    }
                </div>
            </div>
        );
    }
}

export default class ConnectionWidget extends React.Component {
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
            <div><i className="glyphicon glyphicon-log-in"></i>{i18n._('Connection')}</div>
        );
        let toolbarButtons = [
            'toggle'
        ];
        let widgetContentClass = classNames(
            { 'hidden': this.state.isCollapsed }
        );

        return (
            <div data-component="Widgets/ConnectionWidget">
                <Widget width={width}>
                    <WidgetHeader
                        title={title}
                        toolbarButtons={toolbarButtons}
                        handleClick={::this.handleClick}
                    />
                    <WidgetContent className={widgetContentClass}>
                        <Connection />
                    </WidgetContent>
                </Widget>
            </div>
        );
    }
}
