import cx from 'classnames';
import color from 'cli-color';
import PropTypes from 'prop-types';
import pubsub from 'pubsub-js';
import React, { PureComponent } from 'react';
import uuid from 'uuid';
import settings from 'app/config/settings';
import Space from 'app/components/Space';
import Widget from 'app/components/Widget';
import controller from 'app/lib/controller';
import i18n from 'app/lib/i18n';
import WidgetConfig from '../WidgetConfig';
import Console from './Console';
import styles from './index.styl';

// The buffer starts with 254 bytes free. The terminating <LF> or <CR> counts as a byte.
const TERMINAL_COLS = 254;
const TERMINAL_ROWS = 15;

class ConsoleWidget extends PureComponent {
    static propTypes = {
        widgetId: PropTypes.string.isRequired,
        onFork: PropTypes.func.isRequired,
        onRemove: PropTypes.func.isRequired,
        sortable: PropTypes.object
    };

    senderId = uuid.v4();

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
            this.setState(state => ({
                minimized: state.isFullscreen ? state.minimized : false,
                isFullscreen: !state.isFullscreen,
                terminal: {
                    ...state.terminal,
                    rows: state.isFullscreen ? TERMINAL_ROWS : 'auto'
                }
            }), () => {
                this.resizeTerminal();
            });
        },
        toggleMinimized: () => {
            this.setState(state => ({
                minimized: !state.minimized
            }), () => {
                this.resizeTerminal();
            });
        },
        clearAll: () => {
            this.terminal && this.terminal.clear();
        },
        onTerminalData: (data) => {
            const context = {
                __sender__: this.senderId
            };
            controller.write(data, context);
        }
    };

    controllerEvents = {
        'serialport:open': (options) => {
            const { port, baudrate } = options;
            this.setState({ port: port });

            if (this.terminal) {
                const { productName, version } = settings;
                this.terminal.writeln(color.white.bold(`${productName} ${version} [${controller.type}]`));
                this.terminal.writeln(color.white(i18n._('Connected to {{-port}} with a baud rate of {{baudrate}}', { port: color.yellowBright(port), baudrate: color.blueBright(baudrate) })));
            }
        },
        'serialport:close': (options) => {
            this.actions.clearAll();

            const initialState = this.getInitialState();
            this.setState({ ...initialState });
        },
        'serialport:write': (data, context) => {
            const { source, __sender__ } = { ...context };

            if (__sender__ === this.senderId) {
                // Do not write to the terminal console if the sender is the widget itself
                return;
            }

            if (!this.terminal) {
                return;
            }

            data = String(data).trim();

            data = data.replace(/[^\x20-\x7E]/g, (m) => {
                return '\\x' + m.charCodeAt(0).toString(16);
            });

            if (source) {
                this.terminal.writeln(color.blackBright(source) + color.white(this.terminal.prompt + data));
            } else {
                this.terminal.writeln(color.white(this.terminal.prompt + data));
            }
        },
        'serialport:read': (data) => {
            if (!this.terminal) {
                return;
            }

            this.terminal.writeln(data);
        }
    };

    terminal = null;

    pubsubTokens = [];

    componentDidMount() {
        this.addControllerEvents();
        this.subscribe();
    }

    componentWillUnmount() {
        this.removeControllerEvents();
        this.unsubscribe();
    }

    componentDidUpdate(prevProps, prevState) {
        const {
            minimized
        } = this.state;

        this.config.set('minimized', minimized);
    }

    getInitialState() {
        return {
            minimized: this.config.get('minimized', false),
            isFullscreen: false,
            port: controller.port,

            // Terminal
            terminal: {
                cols: TERMINAL_COLS,
                rows: TERMINAL_ROWS,
                cursorBlink: true,
                scrollback: 1000,
                tabStopWidth: 4
            }
        };
    }

    subscribe() {
        const tokens = [
            pubsub.subscribe('resize', (msg) => {
                this.resizeTerminal();
            })
        ];
        this.pubsubTokens = this.pubsubTokens.concat(tokens);
    }

    unsubscribe() {
        this.pubsubTokens.forEach((token) => {
            pubsub.unsubscribe(token);
        });
        this.pubsubTokens = [];
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

    resizeTerminal() {
        this.terminal && this.terminal.resize();
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
                        {i18n._('Console')}
                    </Widget.Title>
                    <Widget.Controls className={this.props.sortable.filterClassName}>
                        <Widget.Button
                            title={i18n._('Clear all')}
                            onClick={actions.clearAll}
                        >
                            <i className="fa fa-trash" />
                        </Widget.Button>
                        <Widget.Button
                            disabled={isFullscreen}
                            title={minimized ? i18n._('Expand') : i18n._('Collapse')}
                            onClick={actions.toggleMinimized}
                        >
                            <i
                                className={cx(
                                    'fa',
                                    { 'fa-chevron-up': !minimized },
                                    { 'fa-chevron-down': minimized }
                                )}
                            />
                        </Widget.Button>
                        <Widget.Button
                            title={!isFullscreen ? i18n._('Enter Full Screen') : i18n._('Exit Full Screen')}
                            onClick={actions.toggleFullscreen}
                        >
                            <i
                                className={cx(
                                    'fa',
                                    { 'fa-expand': !isFullscreen },
                                    { 'fa-compress': isFullscreen }
                                )}
                            />
                        </Widget.Button>
                        <Widget.DropdownButton
                            title={i18n._('More')}
                            toggle={<i className="fa fa-ellipsis-v" />}
                            onSelect={(eventKey) => {
                                if (eventKey === 'selectAll') {
                                    this.terminal.selectAll();
                                } else if (eventKey === 'clearSelection') {
                                    this.terminal.clearSelection();
                                } if (eventKey === 'fork') {
                                    this.props.onFork();
                                } else if (eventKey === 'remove') {
                                    this.props.onRemove();
                                }
                            }}
                        >
                            <Widget.DropdownMenuItem eventKey="selectAll">
                                <i
                                    className={cx(
                                        styles.icon,
                                        styles.selectAll
                                    )}
                                />
                                <Space width="4" />
                                {i18n._('Select All')}
                            </Widget.DropdownMenuItem>
                            <Widget.DropdownMenuItem eventKey="clearSelection">
                                <i className="fa fa-fw fa-window-close-o" />
                                <Space width="4" />
                                {i18n._('Clear Selection')}
                            </Widget.DropdownMenuItem>
                            <Widget.DropdownMenuItem eventKey="fork">
                                <i className="fa fa-fw fa-code-fork" />
                                <Space width="4" />
                                {i18n._('Fork Widget')}
                            </Widget.DropdownMenuItem>
                            <Widget.DropdownMenuItem eventKey="remove">
                                <i className="fa fa-fw fa-times" />
                                <Space width="4" />
                                {i18n._('Remove Widget')}
                            </Widget.DropdownMenuItem>
                        </Widget.DropdownButton>
                    </Widget.Controls>
                </Widget.Header>
                <Widget.Content
                    className={cx(
                        styles.widgetContent,
                        { [styles.hidden]: minimized },
                        { [styles.fullscreen]: isFullscreen }
                    )}
                >
                    <Console
                        ref={node => {
                            if (node) {
                                this.terminal = node.terminal;
                            }
                        }}
                        state={state}
                        actions={actions}
                    />
                </Widget.Content>
            </Widget>
        );
    }
}

export default ConsoleWidget;
