import _ from 'lodash';
import pubsub from 'pubsub-js';
import React from 'react';
import request from 'superagent';
import Select from 'react-select';
import Alert from './Alert';
import i18n from '../../../lib/i18n';
import log from '../../../lib/log';
import controller from '../../../lib/controller';
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
            115200,
            57600,
            38400,
            19200,
            9600,
            4800,
            2400
        ],
        port: controller.port,
        baudrate: store.get('widgets.connection.baudrate'),
        autoReconnect: store.get('widgets.connection.autoReconnect'),
        hasReconnected: false,
        alertMessage: ''
    };
    controllerEvents = {
        'serialport:list': (ports) => {
            log.debug('Received a list of serial ports:', ports);

            this.stopLoading();

            this.clearAlert();

            const port = store.get('widgets.connection.port') || '';

            if (_.includes(_.map(ports, 'port'), port)) {
                this.setState({
                    port: port,
                    ports: ports
                });

                const { autoReconnect, hasReconnected } = this.state;

                if (autoReconnect && !hasReconnected) {
                    this.setState({ hasReconnected: true });
                    this.openPort(port);
                }
            } else {
                this.setState({ ports: ports });
            }
        },
        'serialport:open': (options) => {
            const { port, baudrate, inuse } = options;
            const ports = _.map(this.state.ports, (o) => {
                if (o.port !== port) {
                    return o;
                }

                return _.extend(o, { inuse });
            });

            this.clearAlert();

            pubsub.publish('port', port);

            // save the port
            store.set('widgets.connection.port', port);

            this.setState({
                connecting: false,
                connected: true,
                port,
                baudrate,
                ports
            });

            log.debug('Connected to \'' + port + '\' at ' + baudrate + '.');
        },
        'serialport:close': (options) => {
            const { port } = options;

            this.clearAlert();

            // Close port
            pubsub.publish('port', '');

            this.setState({
                connecting: false,
                connected: false
            });

            log.debug('Disconnected from \'' + port + '\'.');
        },
        'serialport:error': (options) => {
            const { port } = options;

            this.showAlert('Error opening serial port \'' + port + '\'');

            // Close port
            pubsub.publish('port', '');

            this.setState({
                connecting: false,
                connected: false
            });

            log.error('Error opening serial port \'' + port + '\'');
        }
    };

    componentWillMount() {
        this.handleRefresh();
    }
    componentDidMount() {
        this.addControllerEvents();
    }
    componentWillUnmount() {
        this.removeControllerEvents();
    }
    shouldComponentUpdate(nextProps, nextState) {
        return !_.isEqual(nextProps, this.props) || !_.isEqual(nextState, this.state);
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
    showAlert(msg) {
        this.setState({ alertMessage: msg });
    }
    clearAlert() {
        this.setState({ alertMessage: '' });
    }
    startLoading() {
        const delay = 5 * 1000; // wait for 5 seconds

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
        const o = _.find(this.state.ports, { port }) || {};
        return !!(o.inuse);
    }
    handleRefresh() {
        controller.listAllPorts();
        this.startLoading();
    }
    openPort(port = this.state.port, baudrate = this.state.baudrate) {
        this.setState({
            connecting: true
        });
        controller.openPort(port, baudrate);

        request
            .get('/api/controllers')
            .end((err, res) => {
                if (err || !res.ok) {
                    return;
                }

                const portData = _.find(res.body, { port });
                if (!portData) {
                    return;
                }

                log.debug(portData);

                const isRunning = _.get(portData, 'state.isRunning');
                const gcode = _.get(portData, 'gcode.gcode');

                if (gcode) {
                    pubsub.publish('gcode:load', gcode);
                }

                // TODO: Check paused and idle state as well
                if (isRunning) {
                    pubsub.publish('workflowState', WORKFLOW_STATE_RUNNING);
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
        controller.closePort(port);

        // Refresh ports
        controller.listAllPorts();
    }
    changePortOption(option) {
        this.setState({
            alertMessage: '',
            port: option.value
        });
    }
    changeBaudrateOption(option) {
        this.setState({
            alertMessage: '',
            baudrate: option.value
        });
        store.set('widgets.connection.baudrate', option.value);
    }
    handleAutoReconnect(event) {
        const checked = event.target.checked;
        store.set('widgets.connection.autoReconnect', checked);
    }
    renderPortOption(option) {
        const { label, inuse, manufacturer } = option;
        const styles = {
            option: {
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
                    <span><i className="fa fa-lock"></i>&nbsp;</span>
                }
                {label}
                </div>
                {manufacturer &&
                    <note style={styles.note}>
                        {i18n._('Manufacturer: {{manufacturer}}', { manufacturer })}
                    </note>
                }
            </div>
        );
    }
    renderPortValue(option) {
        const { label, inuse } = option;
        const notLoading = !(this.state.loading);
        const canChangePort = notLoading;
        const style = {
            color: canChangePort ? '#333' : '#ccc',
            textOverflow: 'ellipsis',
            overflow: 'hidden'
        };
        return (
            <div style={style} title={label}>
                {inuse &&
                    <span><i className="fa fa-lock"></i>&nbsp;</span>
                }
                {label}
            </div>
        );
    }
    renderBaudrateValue(option) {
        const notLoading = !(this.state.loading);
        const notInUse = !(this.isPortInUse(this.state.port));
        const canChangeBaudrate = notLoading && notInUse;
        const style = {
            color: canChangeBaudrate ? '#333' : '#ccc',
            textOverflow: 'ellipsis',
            overflow: 'hidden'
        };
        return (
            <div style={style} title={option.label}>{option.label}</div>
        );
    }
    render() {
        const {
            loading, connecting, connected,
            ports, baudrates,
            port, baudrate,
            autoReconnect,
            alertMessage
        } = this.state;
        const notLoading = !loading;
        const notConnecting = !connecting;
        const notConnected = !connected;
        const canRefresh = notLoading && notConnected;
        const canChangePort = notLoading && notConnected;
        const canChangeBaudrate = notLoading && notConnected && (!(this.isPortInUse(port)));
        const canOpenPort = port && baudrate && notConnecting && notConnected;
        const canClosePort = connected;

        return (
            <div>
                <Alert msg={alertMessage} dismiss={::this.clearAlert} />
                <div className="form-group">
                    <label className="control-label">{i18n._('Port')}</label>
                    <div className="input-group input-group-sm">
                        <Select
                            backspaceRemoves={false}
                            className="sm"
                            clearable={false}
                            disabled={!canChangePort}
                            name="port"
                            noResultsText={i18n._('No ports available')}
                            onChange={::this.changePortOption}
                            optionRenderer={::this.renderPortOption}
                            options={_.map(ports, (o) => ({
                                value: o.port,
                                label: o.port,
                                manufacturer: o.manufacturer,
                                inuse: o.inuse
                            }))}
                            placeholder={i18n._('Choose a port')}
                            searchable={false}
                            value={port}
                            valueRenderer={::this.renderPortValue}
                        />
                        <div className="input-group-btn">
                            <button
                                type="button"
                                className="btn btn-default"
                                name="btn-refresh"
                                title={i18n._('Refresh')}
                                onClick={::this.handleRefresh}
                                disabled={!canRefresh}
                            >
                            {notLoading
                                ? <i className="fa fa-refresh"></i>
                                : <i className="fa fa-refresh rotating"></i>
                            }
                            </button>
                        </div>
                    </div>
                </div>
                <div className="form-group">
                    <label className="control-label">{i18n._('Baud rate')}</label>
                    <Select
                        backspaceRemoves={false}
                        className="sm"
                        clearable={false}
                        disabled={!canChangeBaudrate}
                        name="baudrate"
                        onChange={::this.changeBaudrateOption}
                        options={_.map(baudrates, (value) => ({
                            value: value,
                            label: Number(value).toString()
                        }))}
                        placeholder={i18n._('Choose a baud rate')}
                        searchable={false}
                        value={baudrate}
                        valueRenderer={::this.renderBaudrateValue}
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
                            <i className="fa fa-toggle-off"></i>&nbsp;{i18n._('Open')}
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
                            <i className="fa fa-toggle-on"></i>&nbsp;{i18n._('Close')}
                        </button>
                    }
                </div>
            </div>
        );
    }
}

export default Connection;
