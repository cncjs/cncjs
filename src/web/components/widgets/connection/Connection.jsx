import _ from 'lodash';
import pubsub from 'pubsub-js';
import React from 'react';
import request from 'superagent';
import Select from 'react-select';
import Alert from './Alert';
import i18n from '../../../lib/i18n';
import log from '../../../lib/log';
import socket from '../../../lib/socket';
import store from '../../../store';
import {
    WORKFLOW_STATE_RUNNING
} from './constants';

class Connection extends React.Component {
    state = {
        loading: false,
        connecting: false,
        connected: false,
        ports: [],
        baudrates: [
            9600,
            19200,
            38400,
            57600,
            115200
        ],
        port: '',
        baudrate: store.getState('widgets.connection.baudrate'),
        autoReconnect: store.getState('widgets.connection.autoReconnect'),
        hasReconnected: false,
        alertMessage: ''
    };
    socketEventListener = {
        'serialport:list': ::this.socketOnSerialPortList,
        'serialport:open': ::this.socketOnSerialPortOpen,
        'serialport:close': ::this.socketOnSerialPortClose,
        'serialport:error': ::this.socketOnSerialPortError
    };

    componentWillMount() {
        this.handleRefresh();
    }
    componentDidMount() {
        this.addSocketEventListener();
    }
    componentWillUnmount() {
        this.removeSocketEventListener();
    }
    addSocketEventListener() {
        _.each(this.socketEventListener, (callback, eventName) => {
            socket.on(eventName, callback);
        });
    }
    removeSocketEventListener() {
        _.each(this.socketEventListener, (callback, eventName) => {
            socket.off(eventName, callback);
        });
    }
    socketOnSerialPortList(ports) {
        log.debug('serialport:list', ports);

        this.stopLoading();

        this.clearAlert();

        let port = store.getState('widgets.connection.port') || '';

        if (_.includes(_.pluck(ports, 'port'), port)) {
            this.setState({
                port: port,
                ports: ports
            });

            let { autoReconnect, hasReconnected } = this.state;

            if (autoReconnect && !hasReconnected) {
                this.setState({ hasReconnected: true });
                this.openPort(port);
            }
        } else {
            this.setState({ ports: ports });
        }
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

        // save the port
        store.setState('widgets.connection.port', port);

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

        this.showAlert('Error opening serial port \'' + port + '\'');

        // Close port
        pubsub.publish('port', '');

        this.setState({
            connecting: false,
            connected: false
        });

        log.error('Error opening serial port \'' + port + '\'');
    }
    showAlert(msg) {
        this.setState({ alertMessage: msg });
    }
    clearAlert() {
        this.setState({ alertMessage: '' });
    }
    startLoading() {
        let delay = 5 * 1000; // wait for 5 seconds

        this.setState({
            loading: true
        });
        this._loadingTimer = setTimeout(() => {
            this.setState({ loading: false });
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
        return !!(o.inuse);
    }
    handleRefresh() {
        socket.emit('list');
        this.startLoading();
    }
    openPort(port = this.state.port, baudrate = this.state.baudrate) {
        this.setState({
            connecting: true
        });
        socket.emit('open', port, baudrate);

        request
            .get('/api/controllers')
            .end((err, res) => {
                if (err || !res.ok) {
                    return;
                }

                let portData = _.findWhere(res.body, { port: port });
                if (!portData) {
                    return;
                }

                let gcode = _.get(portData, 'gcode');
                let isRunning = _.get(portData, 'queue.isRunning');

                if (gcode) {
                    pubsub.publish('gcode:load', gcode);
                }

                // TODO: Check paused and idle state as well
                if (isRunning) {
                    pubsub.publish('setWorkflowState', WORKFLOW_STATE_RUNNING);
                }
            });
    }
    closePort(port = this.state.port) {
        // Close port
        pubsub.publish('port', '');

        this.setState({
            connecting: false,
            connected: false
        });
        socket.emit('close', port);

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
        store.setState('widgets.connection.baudrate', value);
    }
    handleAutoReconnect(event) {
        let checked = event.target.checked;
        store.setState('widgets.connection.autoReconnect', checked);
    }
    renderPortOption(option) {
        let { label, inuse, manufacturer } = option;
        let styles = {
            option:  {
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden'
            },
            note: {
                fontSize: '12px'
            }
        };

        return (
            <div style={styles.option} title={label}>
                <div>
                {inuse &&
                    <span><i className="glyphicon glyphicon-lock"></i>&nbsp;</span>
                }
                {label}
                </div>
                {manufacturer && 
                    <note style={styles.note}>
                        {i18n._('Manufacturer: {{manufacturer}}', { manufacturer: manufacturer })}
                    </note>
                }
            </div>
        );
    }
    renderPortValue(option) {
        let { label, inuse } = option;
        let notLoading = !(this.state.loading);
        let canChangePort = notLoading;
        let style = {
            color: canChangePort ? '#333' : '#ccc',
            textOverflow: 'ellipsis',
            overflow: 'hidden'
        };
        return (
            <div style={style} title={label}>
                {inuse &&
                    <span><i className="glyphicon glyphicon-lock"></i>&nbsp;</span>
                }
                {label}
            </div>
        );
    }
    renderBaudrateValue(option) {
        let notLoading = !(this.state.loading);
        let notInUse = !(this.isPortInUse(this.state.port));
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
        let {
            loading, connecting, connected,
            ports, baudrates,
            port, baudrate,
            autoReconnect,
            alertMessage
        } = this.state;
        let notLoading = !loading;
        let notConnecting = !connecting;
        let notConnected = !connected;
        let canRefresh = notLoading && notConnected;
        let canChangePort = notLoading && notConnected;
        let canChangeBaudrate = notLoading && notConnected && (!(this.isPortInUse(port)));
        let canOpenPort = port && baudrate && notConnecting && notConnected;
        let canClosePort = connected;

        return (
            <div>
                <Alert msg={alertMessage} dismiss={::this.clearAlert} />
                <div className="form-group">
                    <label className="control-label">{i18n._('Port')}</label>
                    <div className="input-group input-group-sm">
                        <Select
                            className="sm"
                            name="port"
                            value={port}
                            options={_.map(ports, (port) => {
                                return {
                                    value: port.port,
                                    label: port.port,
                                    manufacturer: port.manufacturer,
                                    inuse: port.inuse
                                };
                            })}
                            disabled={!canChangePort}
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
                            <button type="button" className="btn btn-default" name="btn-refresh" title={i18n._('Refresh')} onClick={::this.handleRefresh} disabled={!canRefresh}>
                            {notLoading
                                ? <i className="glyphicon glyphicon-refresh"></i>
                                : <i className="glyphicon glyphicon-refresh rotating"></i>
                            }
                            </button>
                        </div>
                    </div>
                </div>
                <div className="form-group">
                    <label className="control-label">{i18n._('Baud rate')}</label>
                    <Select
                        className="sm"
                        name="baudrate"
                        value={baudrate}
                        options={_.map(baudrates, (baudrate) => {
                            return {
                                value: baudrate,
                                label: Number(baudrate).toString()
                            };
                        })}
                        disabled={!canChangeBaudrate}
                        backspaceRemoves={false}
                        clearable={false}
                        searchable={false}
                        placeholder={i18n._('Choose a baud rate')}
                        valueRenderer={::this.renderBaudrateValue}
                        onChange={::this.changeBaudrate}
                    />
                </div>
                <div className="checkbox">
                    <label>
                        <input type="checkbox" defaultChecked={autoReconnect} onChange={::this.handleAutoReconnect} />
                        {i18n._('Connect automatically')}
                    </label>
                </div>
                <div className="btn-group btn-group-sm">
                    {notConnected &&
                        <button
                            type="button"
                            className="btn btn-primary"
                            disabled={!canOpenPort}
                            onClick={() => {
                                this.openPort(port, baudrate);
                            }}
                        >
                            <i className="glyphicon glyphicon-off"></i>&nbsp;{i18n._('Open')}
                        </button>
                    }
                    {connected &&
                        <button
                            type="button"
                            className="btn btn-danger"
                            disabled={!canClosePort}
                            onClick={() => {
                                this.closePort(port);
                            }}
                        >
                            <i className="glyphicon glyphicon-off"></i>&nbsp;{i18n._('Close')}
                        </button>
                    }
                </div>
            </div>
        );
    }
}

export default Connection;
