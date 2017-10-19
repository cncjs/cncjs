import classNames from 'classnames';
import reverse from 'lodash/reverse';
import sortBy from 'lodash/sortBy';
import uniq from 'lodash/uniq';
import includes from 'lodash/includes';
import map from 'lodash/map';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Widget from '../../components/Widget';
import controller from '../../lib/controller';
import i18n from '../../lib/i18n';
import log from '../../lib/log';
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
        handleAutoReconnect: (event) => {
            const checked = event.target.checked;
            this.setState(state => ({
                autoReconnect: checked
            }));
        },
        handleRefreshPorts: (event) => {
            this.refreshPorts();
        },
        handleOpenPort: (event) => {
            this.openPort();
        },
        handleClosePort: (event) => {
            this.closePort();
        }
    };

    controllerEvents = {
        'ports': (ports) => {
            log.debug('Received a list of serial ports:', ports);

            this.stopLoading();

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

                const { autoReconnect, hasReconnected } = this.state;
                if (autoReconnect && !hasReconnected) {
                    this.setState(state => ({
                        hasReconnected: true
                    }));

                    this.openPort(path);
                }
            } else {
                this.setState(state => ({
                    alertMessage: '',
                    ports: ports
                }));
            }
        },
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

                this.refreshPorts();
            }
        },
        'connection:change': (options) => {
            const { type, settings, isOpen } = options;

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
        'connection:error': (options) => {
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
        this.refreshPorts();
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

        // Serial connection
        if (this.state.connection.serial.path) {
            this.config.set('connection.serial.path', this.state.connection.serial.path);
        }
        if (this.state.connection.serial.baudRate) {
            this.config.set('connection.serial.baudRate', this.state.connection.serial.baudRate);
        }

        // Socket connection
        if (this.state.connection.socket.host) {
            this.config.set('connection.socket.host', this.state.connection.socket.host);
        }
        if (this.state.connection.socket.port) {
            this.config.set('connection.socket.port', this.state.connection.socket.port);
        }

        this.config.set('autoReconnect', this.state.autoReconnect);
    }
    getInitialState() {
        let controllerType = this.config.get('controller.type');
        if (!includes(controller.loadedControllers, controllerType)) {
            controllerType = controller.loadedControllers[0];
        }

        // Common baud rates
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
            loading: false,
            connecting: false,
            connected: false,
            ports: [],
            baudRates: reverse(sortBy(uniq(controller.baudRates.concat(defaultBaudRates)))),
            controller: {
                type: this.config.get('controller.type')
            },
            connection: {
                type: this.config.get('connection.type'),
                serial: {
                    path: this.config.get('connection.serial.path'),
                    baudRate: this.config.get('connection.serial.baudRate')
                },
                socket: {
                    host: this.config.get('connection.socket.host'),
                    port: this.config.get('connection.socket.port')
                }
            },
            autoReconnect: this.config.get('autoReconnect'),
            hasReconnected: false,
            alertMessage: ''
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
    startLoading() {
        const delay = 5 * 1000; // wait for 5 seconds

        this.setState(state => ({
            loading: true
        }));
        this._loadingTimer = setTimeout(() => {
            this.setState(state => ({
                loading: false
            }));
        }, delay);
    }
    stopLoading() {
        if (this._loadingTimer) {
            clearTimeout(this._loadingTimer);
            this._loadingTimer = null;
        }
        this.setState(state => ({
            loading: false
        }));
    }
    refreshPorts() {
        this.startLoading();
        controller.getPorts();
    }
    openPort(path, baudRate) {
        this.setState(state => ({
            connecting: true
        }));

        path = path || this.state.connection.serial.path;
        baudRate = baudRate || this.state.connection.serial.baudRate;

        const controllerType = this.state.controller.type;
        const connectionType = this.state.connection.type;
        const options = {
            path: path,
            baudRate: baudRate
        };
        controller.open(controllerType, connectionType, options, (err) => {
            if (err) {
                log.error(err);
                this.setState(state => ({
                    alertMessage: i18n._('Error opening serial port: {{-path}}', { path: path }),
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

            // Refresh ports
            controller.getPorts();
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
                            <span className="space" />
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
                                className={classNames(
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
                                    className={classNames(
                                        'fa',
                                        'fa-fw',
                                        { 'fa-expand': !isFullscreen },
                                        { 'fa-compress': isFullscreen }
                                    )}
                                />
                                <span className="space space-sm" />
                                {!isFullscreen ? i18n._('Enter Full Screen') : i18n._('Exit Full Screen')}
                            </Widget.DropdownMenuItem>
                        </Widget.DropdownButton>
                    </Widget.Controls>
                </Widget.Header>
                <Widget.Content
                    className={classNames(
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
