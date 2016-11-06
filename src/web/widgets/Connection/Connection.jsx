import _ from 'lodash';
import classNames from 'classnames';
import pubsub from 'pubsub-js';
import React from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import Select from 'react-select';
import Notifications from '../../components/Notifications';
import api from '../../api';
import i18n from '../../lib/i18n';
import log from '../../lib/log';
import controller from '../../lib/controller';
import store from '../../store';

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
        controllerType: store.get('widgets.connection.controller.type'),
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
                    const { baudrate } = this.state;

                    this.setState({ hasReconnected: true });
                    this.openPort(port, {
                        baudrate: baudrate
                    });
                }
            } else {
                this.setState({ ports: ports });
            }
        },
        'serialport:open': (options) => {
            const { controllerType, port, baudrate, inuse } = options;
            const ports = _.map(this.state.ports, (o) => {
                if (o.port !== port) {
                    return o;
                }

                return _.extend(o, { inuse });
            });

            this.clearAlert();

            // update controller type
            controller.type = controllerType;

            pubsub.publish('port', port);

            this.setState({
                connecting: false,
                connected: true,
                controllerType: controllerType, // Grbl or TinyG2
                port: port,
                baudrate: baudrate,
                ports: ports
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
        return shallowCompare(this, nextProps, nextState);
    }
    componentDidUpdate(prevProps, prevState) {
        const { controllerType, port, baudrate, autoReconnect } = this.state;

        if (controllerType) {
            store.set('widgets.connection.controller.type', controllerType);
        }
        if (port) {
            store.set('widgets.connection.port', port);
        }
        if (baudrate) {
            store.set('widgets.connection.baudrate', baudrate);
        }
        store.set('widgets.connection.autoReconnect', autoReconnect);
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
    openPort(port, options) {
        const { baudrate } = { ...options };

        this.setState({
            connecting: true
        });

        controller.openPort(port, {
            controllerType: this.state.controllerType,
            baudrate: baudrate
        });

        let workflowState = '';
        let gcode = '';

        api.listControllers()
            .then((res) => {
                let next;
                const c = _.find(res.body, { port: port });

                if (!c) {
                    return next;
                }

                workflowState = _.get(c, 'workflowState');

                if (c.ready) {
                    // Fetch G-code when the controller is ready
                    next = api.fetchGCode({ port: port });
                }

                return next;
            })
            .then((res) => {
                gcode = _.get(res, 'body.data', '');
            })
            .catch((err) => {
                // Empty block
            })
            .then(() => {
                if (workflowState) {
                    pubsub.publish('workflowState', workflowState);
                }
                if (gcode) {
                    pubsub.publish('gcode:load', gcode);
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
    changeController(controllerType) {
        this.setState({ controllerType: controllerType });
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
    }
    handleAutoReconnect(event) {
        const checked = event.target.checked;
        this.setState({
            autoReconnect: checked
        });
    }
    renderPortOption(option) {
        const { label, inuse, manufacturer } = option;
        const styles = {
            option: {
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden'
            }
        };

        return (
            <div style={styles.option} title={label}>
                <div>
                    {inuse &&
                    <span>
                        <i className="fa fa-lock" />
                        <span className="space" />
                    </span>
                    }
                    {label}
                </div>
                {manufacturer &&
                <i>{i18n._('Manufacturer: {{manufacturer}}', { manufacturer })}</i>
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
                <span>
                    <i className="fa fa-lock" />
                    <span className="space" />
                </span>
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
            controllerType,
            ports, baudrates,
            port, baudrate,
            autoReconnect,
            alertMessage
        } = this.state;
        const notLoading = !loading;
        const notConnecting = !connecting;
        const notConnected = !connected;
        const canRefresh = notLoading && notConnected;
        const canChangeController = notLoading && notConnected;
        const canChangePort = notLoading && notConnected;
        const canChangeBaudrate = notLoading && notConnected && (!(this.isPortInUse(port)));
        const canOpenPort = port && baudrate && notConnecting && notConnected;
        const canClosePort = connected;

        return (
            <div>
                {alertMessage &&
                <Notifications bsStyle="danger" onDismiss={::this.clearAlert}>
                    {alertMessage}
                </Notifications>
                }
                <div className="form-group">
                    <div className="input-group input-group-sm">
                        <div className="input-group-btn">
                            <button
                                type="button"
                                className={classNames(
                                    'btn',
                                    'btn-default',
                                    { 'btn-select': controllerType === 'Grbl' }
                                )}
                                disabled={!canChangeController}
                                onClick={() => {
                                    this.changeController('Grbl');
                                }}
                            >
                                Grbl
                            </button>
                            <button
                                type="button"
                                className={classNames(
                                    'btn',
                                    'btn-default',
                                    { 'btn-select': controllerType === 'TinyG2' }
                                )}
                                disabled={!canChangeController}
                                onClick={() => {
                                    this.changeController('TinyG2');
                                }}
                            >
                                TinyG2
                            </button>
                        </div>
                    </div>
                </div>
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
                                <i
                                    className={classNames(
                                        'fa',
                                        'fa-refresh',
                                        { 'fa-spin': loading }
                                    )}
                                />
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
                                this.openPort(port, {
                                    baudrate: baudrate
                                });
                            }}
                        >
                            <i className="fa fa-toggle-off" />
                            <span className="space" />
                            {i18n._('Open')}
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
                            <i className="fa fa-toggle-on" />
                            <span className="space" />
                            {i18n._('Close')}
                        </button>
                    }
                </div>
            </div>
        );
    }
}

export default Connection;
