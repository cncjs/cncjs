import classNames from 'classnames';
import get from 'lodash/get';
import reverse from 'lodash/reverse';
import sortBy from 'lodash/sortBy';
import uniq from 'lodash/uniq';
import find from 'lodash/find';
import includes from 'lodash/includes';
import map from 'lodash/map';
import pubsub from 'pubsub-js';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Widget from '../../components/Widget';
import api from '../../api';
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
                controllerType: controllerType
            }));
        },
        onChangePortOption: (option) => {
            this.setState(state => ({
                alertMessage: '',
                port: option.value
            }));
        },
        onChangeBaudrateOption: (option) => {
            this.setState(state => ({
                alertMessage: '',
                baudrate: option.value
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
            const { port, baudrate } = this.state;
            this.openPort(port, { baudrate: baudrate });
        },
        handleClosePort: (event) => {
            const { port } = this.state;
            this.closePort(port);
        }
    };

    controllerEvents = {
        'serialport:list': (ports) => {
            log.debug('Received a list of serial ports:', ports);

            this.stopLoading();

            const port = this.config.get('port') || '';

            if (includes(map(ports, 'port'), port)) {
                this.setState(state => ({
                    alertMessage: '',
                    port: port,
                    ports: ports
                }));

                const { autoReconnect, hasReconnected } = this.state;

                if (autoReconnect && !hasReconnected) {
                    const { baudrate } = this.state;

                    this.setState(state => ({
                        hasReconnected: true
                    }));
                    this.openPort(port, {
                        baudrate: baudrate
                    });
                }
            } else {
                this.setState(state => ({
                    alertMessage: '',
                    ports: ports
                }));
            }
        },
        'serialport:open': (options) => {
            const { controllerType, port, baudrate, inuse } = options;
            const ports = map(this.state.ports, (o) => {
                if (o.port !== port) {
                    return o;
                }

                o = { ...o, inuse };

                return o;
            });

            this.setState(state => ({
                alertMessage: '',
                connecting: false,
                connected: true,
                controllerType: controllerType, // Grbl|Smoothie|TinyG
                port: port,
                baudrate: baudrate,
                ports: ports
            }));

            log.debug('Connected to \'' + port + '\' at ' + baudrate + '.');
        },
        'serialport:close': (options) => {
            const { port } = options;

            this.setState(state => ({
                alertMessage: '',
                connecting: false,
                connected: false
            }));

            log.debug('Disconnected from \'' + port + '\'.');
        },
        'serialport:error': (options) => {
            const { port } = options;

            this.setState(state => ({
                alertMessage: i18n._('Error opening serial port \'{{- port}}\'', { port: port }),
                connecting: false,
                connected: false
            }));

            log.error('Error opening serial port \'' + port + '\'');
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
        const {
            minimized,
            controllerType,
            port,
            baudrate,
            autoReconnect
        } = this.state;

        this.config.set('minimized', minimized);
        if (controllerType) {
            this.config.set('controller.type', controllerType);
        }
        if (port) {
            this.config.set('port', port);
        }
        if (baudrate) {
            this.config.set('baudrate', baudrate);
        }
        this.config.set('autoReconnect', autoReconnect);
    }
    getInitialState() {
        let controllerType = this.config.get('controller.type');
        if (!includes(controller.loadedControllers, controllerType)) {
            controllerType = controller.loadedControllers[0];
        }

        // Common baud rates
        const defaultBaudrates = [
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
            baudrates: reverse(sortBy(uniq(controller.baudrates.concat(defaultBaudrates)))),
            controllerType: controllerType,
            port: controller.port,
            baudrate: this.config.get('baudrate'),
            autoReconnect: this.config.get('autoReconnect'),
            hasReconnected: false,
            alertMessage: ''
        };
    }
    addControllerEvents() {
        Object.keys(this.controllerEvents).forEach(eventName => {
            const callback = this.controllerEvents[eventName];
            controller.on(eventName, callback);
        });
    }
    removeControllerEvents() {
        Object.keys(this.controllerEvents).forEach(eventName => {
            const callback = this.controllerEvents[eventName];
            controller.off(eventName, callback);
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
        controller.listPorts();
        this.startLoading();
    }
    openPort(port, options) {
        const { baudrate } = { ...options };

        this.setState(state => ({
            connecting: true
        }));

        controller.openPort(port, {
            controllerType: this.state.controllerType,
            baudrate: baudrate
        }, (err) => {
            if (err) {
                this.setState(state => ({
                    alertMessage: i18n._('Error opening serial port \'{{- port}}\'', { port: port }),
                    connecting: false,
                    connected: false
                }));

                log.error(err);
                return;
            }

            let name = '';
            let gcode = '';

            api.controllers.get()
                .then((res) => {
                    let next;
                    const c = find(res.body, { port: port });
                    if (c) {
                        next = api.fetchGCode({ port: port });
                    }
                    return next;
                })
                .then((res) => {
                    name = get(res, 'body.name', '');
                    gcode = get(res, 'body.data', '');
                })
                .catch((res) => {
                    // Empty block
                })
                .then(() => {
                    if (gcode) {
                        pubsub.publish('gcode:load', { name, gcode });
                    }
                });
        });
    }
    closePort(port = this.state.port) {
        this.setState(state => ({
            connecting: false,
            connected: false
        }));
        controller.closePort(port, (err) => {
            if (err) {
                log.error(err);
                return;
            }

            // Refresh ports
            controller.listPorts();
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
                        {i18n._('Connection')}
                        {isForkedWidget &&
                        <i className="fa fa-code-fork" style={{ marginLeft: 5 }} />
                        }
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
                            title={<i className="fa fa-ellipsis-v" />}
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
