import classNames from 'classnames';
import PropTypes from 'prop-types';
import pubsub from 'pubsub-js';
import React, { PureComponent } from 'react';
import settings from '../../config/settings';
import Widget from '../../components/Widget';
import controller from '../../lib/controller';
import i18n from '../../lib/i18n';
import WidgetConfig from '../WidgetConfig';
import Console from './Console';
import styles from './index.styl';

const appName = settings.name;
const appVersion = settings.version;

class ConsoleWidget extends PureComponent {
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

            setTimeout(() => {
                this.resizeTerminal();
            }, 0);
        },
        toggleMinimized: () => {
            const { minimized } = this.state;
            this.setState(state => ({
                minimized: !minimized
            }));

            setTimeout(() => {
                this.resizeTerminal();
            }, 0);
        },
        clearAll: () => {
            this.terminal && this.terminal.clear();
        },
        onTerminalData: (data) => {
            const context = {
                __sender__: this.props.widgetId
            };
            controller.write(data, context);
        }
    };
    controllerEvents = {
        'connection:open': (options) => {
            const { ident } = options;
            this.setState(state => ({
                connection: {
                    ...state.connection,
                    ident: ident
                }
            }));

            if (!this.terminal) {
                return;
            }

            this.terminal.writeln(`${appName} ${appVersion} [${controller.type}]`);

            const { type, settings } = options;
            if (type === 'serial') {
                const { path, baudRate } = { ...settings };
                this.terminal.writeln(i18n._('Connected to {{-path}} with a baud rate of {{baudRate}}', { path, baudRate }));
            } else if (type === 'socket') {
                const { host, port } = { ...settings };
                this.terminal.writeln(i18n._('Connected to {{host}}:{{port}}', { host, port }));
            }
        },
        'connection:close': (options) => {
            const initialState = this.getInitialState();
            this.setState({ ...initialState });
            this.actions.clearAll();
        },
        'connection:write': (data, context) => {
            if (context && (context.__sender__ === this.props.widgetId)) {
                // Do not write to the terminal console if the sender is the widget itself
                return;
            }

            if (!this.terminal) {
                return;
            }

            data = String(data);
            if (data.charAt(data.length - 1) !== '\n') {
                data += '\n';
            }
            data = data.replace(/\r?\n/g, '\r\n');
            this.terminal.write(data);
        },
        'connection:read': (data) => {
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
            connection: {
                ident: controller.connection.ident
            },

            // Terminal
            terminal: {
                cols: 128,
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
                            <span className="space" />
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
                            <i className="fa fa-ban fa-flip-horizontal" />
                        </Widget.Button>
                        <Widget.Button
                            disabled={isFullscreen}
                            title={minimized ? i18n._('Expand') : i18n._('Collapse')}
                            onClick={actions.toggleMinimized}
                        >
                            <i
                                className={classNames(
                                    'fa',
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
                                } else if (eventKey === 'fork') {
                                    this.props.onFork();
                                } else if (eventKey === 'remove') {
                                    this.props.onRemove();
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
                            <Widget.DropdownMenuItem eventKey="fork">
                                <i className="fa fa-fw fa-code-fork" />
                                <span className="space space-sm" />
                                {i18n._('Fork Widget')}
                            </Widget.DropdownMenuItem>
                            <Widget.DropdownMenuItem eventKey="remove">
                                <i className="fa fa-fw fa-times" />
                                <span className="space space-sm" />
                                {i18n._('Remove Widget')}
                            </Widget.DropdownMenuItem>
                        </Widget.DropdownButton>
                    </Widget.Controls>
                </Widget.Header>
                <Widget.Content
                    className={classNames(
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
