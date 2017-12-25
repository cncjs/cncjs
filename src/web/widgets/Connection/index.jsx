import cx from 'classnames';
import reverse from 'lodash/reverse';
import sortBy from 'lodash/sortBy';
import uniq from 'lodash/uniq';
import includes from 'lodash/includes';
import map from 'lodash/map';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Space from '../../components/Space';
import Widget from '../../components/Widget';
import controller from '../../lib/controller';
import i18n from '../../lib/i18n';
import log from '../../lib/log';
import promisify from '../../lib/promisify';
import WidgetConfig from '../WidgetConfig';
import Connection from './Connection';
import styles from './index.styl';

class ConnectionWidget extends PureComponent {
    static propTypes = {
        widgetId: PropTypes.string.isRequired,
        onFork: PropTypes.func.isRequired,
        onRemove: PropTypes.func.isRequired,
        sortable: PropTypes.object
    };

    // Public methods
    collapse = () => {
        this.setState({ minimized: true });
    };
    expand = () => {
        this.setState({ minimized: false });
    };

    config = new WidgetConfig(this.props.widgetId);
    state = this.getInitialState();
    actions = {
        toggleFullscreen: () => {
            const { minimized, isFullscreen } = this.state;
            this.setState(state => ({
                minimized: isFullscreen ? minimized : false,
                isFullscreen: !isFullscreen
            }));
        },
        toggleMinimized: () => {
            const { minimized } = this.state;
            this.setState(state => ({
                minimized: !minimized
            }));
        },
        clearAlert: () => {
            this.setState(state => ({
                alertMessage: ''
            }));
        },
        changeController: (controllerType) => {
            this.setState(state => ({
                controller: {
                    ...state.controller,
                    type: controllerType
                }
            }));
        },
        onChangePortOption: (option) => {
            this.setState(state => ({
                alertMessage: '',
                connection: {
                    ...state.connection,
                    serial: {
                        ...state.connection.serial,
                        path: option.value
                    }
                }
            }));
        },
        onChangeBaudRateOption: (option) => {
            this.setState(state => ({
                alertMessage: '',
                connection: {
                    ...state.connection,
                    serial: {
                        ...state.connection.serial,
                        baudRate: option.value
                    }
                }
            }));
        },
        toggleHardwareFlowControl: (event) => {
            const checked = event.target.checked;
            this.setState(state => ({
                connection: {
                    ...state.connection,
                    serial: {
                        ...state.connection.serial,
                        rtscts: checked
                    }
                }
            }));
        },
        toggleAutoReconnect: (event) => {
            const checked = event.target.checked;
            this.setState(state => ({
                autoReconnect: checked
            }));
        },
        handleRefresh: (event) => {
            this.refresh();
        },
        handleOpenPort: (event) => {
            this.openPort();
        },
        handleClosePort: (event) => {
            this.closePort();
        }
    };

    controllerEvents = {
        'connection:open': (options) => {
            const { type, settings } = options;

            if (type === 'serial') {
                log.debug(`A new connection was established: type=${type}, settings=${settings}`);

                this.setState(state => ({
                    alertMessage: '',
                    connecting: false,
                    connected: true,
                    ports: state.ports.map(port => {
                        if (port.comName !== settings.path) {
                            return port;
                        }
                        return { ...port, isOpen: true };
                    })
                }));
            }
        },
        'connection:close': (options) => {
            const { type, settings } = options;

            if (type === 'serial') {
                log.debug(`The connection was closed: type=${type}, settings=${settings}`);

                this.setState(state => ({
                    alertMessage: '',
                    connecting: false,
                    connected: false,
                    ports: state.ports.map(port => {
                        if (port.comName !== settings.path) {
                            return port;
                        }
                        return { ...port, isOpen: false };
                    })
                }));

                this.refresh();
            }
        },
        'connection:change': (options, isOpen) => {
            const { type, settings } = options;

            if (type === 'serial') {
                this.setState(state => ({
                    ports: state.ports.map(port => {
                        if (port.comName !== settings.path) {
                            return port;
                        }
                        return { ...port, isOpen: isOpen };
                    })
                }));
            }
        },
        'connection:error': (options, err) => {
            const { type, settings } = options;

            if (type === 'serial') {
                log.error(`Error opening serial port: type=${type}, settings=${settings}`);

                this.setState(state => ({
                    alertMessage: i18n._('Error opening serial port: {{-path}}', { path: settings.path }),
                    connecting: false,
                    connected: false
                }));
            }
        }
    };

    componentDidMount() {
        this.addControllerEvents();
        this.refresh({ autoConnect: true });
    }
    componentWillUnmount() {
        this.removeControllerEvents();
    }
    componentDidUpdate(prevProps, prevState) {
        this.config.set('minimized', this.state.minimized);

        // Controller
        if (this.state.controller.type) {
            this.config.set('controller.type', this.state.controller.type);
        }

        { // Serial connection
            if (this.state.connection.serial.path !== prevState.connection.serial.path) {
                this.config.set('connection.serial.path', this.state.connection.serial.path);
            }
            if (this.state.connection.serial.baudRate !== prevState.connection.serial.baudRate) {
                this.config.set('connection.serial.baudRate', this.state.connection.serial.baudRate);
            }
            // Hardware flow control
            this.config.set('connection.serial.rtscts', this.state.connection.serial.rtscts);
        }

        { // Socket connection
            if (this.state.connection.socket.host !== prevState.connection.socket.host) {
                this.config.set('connection.socket.host', this.state.connection.socket.host);
            }
            if (this.state.connection.socket.port !== prevState.connection.socket.port) {
                this.config.set('connection.socket.port', this.state.connection.socket.port);
            }
        }

        this.config.set('autoReconnect', this.state.autoReconnect);
    }
    getInitialState() {
        let controllerType = this.config.get('controller.type');
        if (!includes(controller.availableControllers, controllerType)) {
            controllerType = controller.availableControllers[0];
        }

        // Default baud rates
        const defaultBaudRates = [
            250000,
            115200,
            57600,
            38400,
            19200,
            9600,
            2400
        ];

        return {
            minimized: this.config.get('minimized', false),
            isFullscreen: false,
            ports: [],
            baudRates: defaultBaudRates,
            alertMessage: '',
            autoReconnect: this.config.get('autoReconnect'),
            connecting: false,
            connected: false,
            loading: false,
            controller: {
                type: this.config.get('controller.type')
            },
            connection: {
                type: this.config.get('connection.type'),
                serial: {
                    path: this.config.get('connection.serial.path'),
                    baudRate: this.config.get('connection.serial.baudRate'),
                    rtscts: this.config.get('connection.serial.rtscts')
                },
                socket: {
                    host: this.config.get('connection.socket.host'),
                    port: this.config.get('connection.socket.port')
                }
            }
        };
    }
    addControllerEvents() {
        Object.keys(this.controllerEvents).forEach(eventName => {
            const callback = this.controllerEvents[eventName];
            controller.addListener(eventName, callback);
        });
    }
    removeControllerEvents() {
        Object.keys(this.controllerEvents).forEach(eventName => {
            const callback = this.controllerEvents[eventName];
            controller.removeListener(eventName, callback);
        });
    }
    async refresh(options) {
        const { autoConnect = false } = { ...options };

        let loadingTimer = null;

        // Start loading
        this.setState(state => ({
            loading: true
        }));

        // Create a timer to stop loading
        const delay = 5000; // up to 5 seconds
        loadingTimer = setTimeout(() => {
            loadingTimer = null;

            this.setState(state => ({
                loading: false
            }));
        }, delay);

        const fetchBaudRates = promisify(controller.getBaudRates, {
            errorFirst: true,
            thisArg: controller
        });
        const fetchPorts = promisify(controller.getPorts, {
            errorFirst: true,
            thisArg: controller
        });

        try {
            const baudRates = await fetchBaudRates();
            log.debug('Received a list of supported baud rates:', baudRates);
            this.setState(state => ({
                baudRates: reverse(sortBy(uniq(baudRates.concat(state.baudRates))))
            }));

            const ports = await fetchPorts();
            log.debug('Received a list of available serial ports:', ports);
            const path = this.config.get('connection.serial.path');
            if (includes(map(ports, 'comName'), path)) {
                this.setState(state => ({
                    alertMessage: '',
                    ports: ports,
                    connection: {
                        ...state.connection,
                        serial: {
                            ...state.connection.serial,
                            path: path
                        }
                    }
                }));

                if (this.state.autoReconnect && autoConnect) {
                    this.openPort(path);
                }
            } else {
                this.setState(state => ({
                    alertMessage: '',
                    ports: ports
                }));
            }
        } catch (err) {
            log.error(err);
        }

        // Stop loading
        if (loadingTimer) {
            clearTimeout(loadingTimer);
            loadingTimer = null;
        }
        this.setState(state => ({
            loading: false
        }));
    }
    openPort(path, baudRate) {
        const controllerType = this.state.controller.type;
        const connectionType = this.state.connection.type;
        const options = {
            path: path || this.state.connection.serial.path,
            baudRate: baudRate || this.state.connection.serial.baudRate,
            rtscts: this.state.connection.serial.rtscts
        };

        this.setState(state => ({
            connecting: true
        }));

        controller.open(controllerType, connectionType, options, (err) => {
            if (err) {
                log.error(err);
                this.setState(state => ({
                    alertMessage: i18n._('Error opening serial port: {{-path}}', { path: options.path }),
                    connecting: false,
                    connected: false
                }));
                return;
            }
        });
    }
    closePort() {
        this.setState(state => ({
            connecting: false,
            connected: false
        }));

        controller.close(err => {
            if (err) {
                log.error(err);
                return;
            }

            this.refresh();
        });
    }
    render() {
        const { widgetId } = this.props;
        const { minimized, isFullscreen } = this.state;
        const isForkedWidget = widgetId.match(/\w+:[\w\-]+/);
        const state = {
            ...this.state
        };
        const actions = {
            ...this.actions
        };

        return (
            <Widget fullscreen={isFullscreen}>
                <Widget.Header>
                    <Widget.Title>
                        <Widget.Sortable className={this.props.sortable.handleClassName}>
                            <i className="fa fa-bars" />
                            <Space width="8" />
                        </Widget.Sortable>
                        {isForkedWidget &&
                        <i className="fa fa-code-fork" style={{ marginRight: 5 }} />
                        }
                        {i18n._('Connection')}
                    </Widget.Title>
                    <Widget.Controls className={this.props.sortable.filterClassName}>
                        <Widget.Button
                            disabled={isFullscreen}
                            title={minimized ? i18n._('Expand') : i18n._('Collapse')}
                            onClick={actions.toggleMinimized}
                        >
                            <i
                                className={cx(
                                    'fa',
                                    'fa-fw',
                                    { 'fa-chevron-up': !minimized },
                                    { 'fa-chevron-down': minimized }
                                )}
                            />
                        </Widget.Button>
                        <Widget.DropdownButton
                            title={i18n._('More')}
                            toggle={<i className="fa fa-ellipsis-v" />}
                            onSelect={(eventKey) => {
                                if (eventKey === 'fullscreen') {
                                    actions.toggleFullscreen();
                                }
                            }}
                        >
                            <Widget.DropdownMenuItem eventKey="fullscreen">
                                <i
                                    className={cx(
                                        'fa',
                                        'fa-fw',
                                        { 'fa-expand': !isFullscreen },
                                        { 'fa-compress': isFullscreen }
                                    )}
                                />
                                <Space width="4" />
                                {!isFullscreen ? i18n._('Enter Full Screen') : i18n._('Exit Full Screen')}
                            </Widget.DropdownMenuItem>
                        </Widget.DropdownButton>
                    </Widget.Controls>
                </Widget.Header>
                <Widget.Content
                    className={cx(
                        styles['widget-content'],
                        { [styles.hidden]: minimized }
                    )}
                >
                    <Connection state={state} actions={actions} />
                </Widget.Content>
            </Widget>
        );
    }
}

export default ConnectionWidget;
