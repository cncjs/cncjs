import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import FontAwesomeIcon from 'app/components/FontAwesomeIcon';
import Space from 'app/components/Space';
import Widget from 'app/components/Widget';
import {
    TINYG
} from 'app/constants';
import controller from 'app/lib/controller';
import i18n from 'app/lib/i18n';
import WidgetConfig from 'app/widgets/WidgetConfig';
import TinyG from './TinyG';
import Controller from './Controller';
import {
    MODAL_NONE,
    MODAL_CONTROLLER
} from './constants';
import styles from './index.styl';

class TinyGWidget extends PureComponent {
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
            this.setState({
                minimized: isFullscreen ? minimized : false,
                isFullscreen: !isFullscreen
            });
        },
        toggleMinimized: () => {
            const { minimized } = this.state;
            this.setState({ minimized: !minimized });
        },
        openModal: (name = MODAL_NONE, params = {}) => {
            this.setState({
                modal: {
                    name: name,
                    params: params
                }
            });
        },
        closeModal: () => {
            this.setState({
                modal: {
                    name: MODAL_NONE,
                    params: {}
                }
            });
        },
        updateModalParams: (params = {}) => {
            this.setState({
                modal: {
                    ...this.state.modal,
                    params: {
                        ...this.state.modal.params,
                        ...params
                    }
                }
            });
        },
        togglePowerManagement: () => {
            const expanded = this.state.panel.powerManagement.expanded;

            this.setState({
                panel: {
                    ...this.state.panel,
                    powerManagement: {
                        ...this.state.panel.powerManagement,
                        expanded: !expanded
                    }
                }
            });
        },
        toggleQueueReports: () => {
            const expanded = this.state.panel.queueReports.expanded;

            this.setState({
                panel: {
                    ...this.state.panel,
                    queueReports: {
                        ...this.state.panel.queueReports,
                        expanded: !expanded
                    }
                }
            });
        },
        toggleStatusReports: () => {
            const expanded = this.state.panel.statusReports.expanded;

            this.setState({
                panel: {
                    ...this.state.panel,
                    statusReports: {
                        ...this.state.panel.statusReports,
                        expanded: !expanded
                    }
                }
            });
        },
        toggleModalGroups: () => {
            const expanded = this.state.panel.modalGroups.expanded;

            this.setState({
                panel: {
                    ...this.state.panel,
                    modalGroups: {
                        ...this.state.panel.modalGroups,
                        expanded: !expanded
                    }
                }
            });
        }
    };

    controllerEvents = {
        'serialport:open': (options) => {
            const { port, controllerType } = options;
            this.setState({
                isReady: controllerType === TINYG,
                port: port
            });
        },
        'serialport:close': (options) => {
            const initialState = this.getInitialState();
            this.setState({ ...initialState });
        },
        'controller:settings': (type, controllerSettings) => {
            if (type === TINYG) {
                this.setState(state => ({
                    controller: {
                        ...state.controller,
                        type: type,
                        settings: controllerSettings
                    }
                }));
            }
        },
        'controller:state': (type, controllerState) => {
            if (type === TINYG) {
                this.setState(state => ({
                    controller: {
                        ...state.controller,
                        type: type,
                        state: controllerState
                    }
                }));
            }
        }
    };

    componentDidMount() {
        this.addControllerEvents();
    }

    componentWillUnmount() {
        this.removeControllerEvents();
    }

    componentDidUpdate(prevProps, prevState) {
        const {
            minimized,
            panel
        } = this.state;

        this.config.set('minimized', minimized);
        this.config.set('panel.powerManagement.expanded', panel.powerManagement.expanded);
        this.config.set('panel.queueReports.expanded', panel.queueReports.expanded);
        this.config.set('panel.statusReports.expanded', panel.statusReports.expanded);
        this.config.set('panel.modalGroups.expanded', panel.modalGroups.expanded);
    }

    getInitialState() {
        return {
            minimized: this.config.get('minimized', false),
            isFullscreen: false,
            isReady: (controller.loadedControllers.length === 1) || (controller.type === TINYG),
            canClick: true, // Defaults to true
            port: controller.port,
            controller: {
                type: controller.type,
                settings: controller.settings,
                state: controller.state
            },
            modal: {
                name: MODAL_NONE,
                params: {}
            },
            panel: {
                powerManagement: {
                    expanded: this.config.get('panel.powerManagement.expanded')
                },
                queueReports: {
                    expanded: this.config.get('panel.queueReports.expanded')
                },
                statusReports: {
                    expanded: this.config.get('panel.statusReports.expanded')
                },
                modalGroups: {
                    expanded: this.config.get('panel.modalGroups.expanded')
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

    canClick() {
        const { port } = this.state;
        const { type } = this.state.controller;

        if (!port) {
            return false;
        }
        if (type !== TINYG) {
            return false;
        }

        return true;
    }

    render() {
        const { widgetId } = this.props;
        const { minimized, isFullscreen, isReady } = this.state;
        const isForkedWidget = widgetId.match(/\w+:[\w\-]+/);
        const state = {
            ...this.state,
            canClick: this.canClick()
        };
        const actions = {
            ...this.actions
        };

        return (
            <Widget fullscreen={isFullscreen}>
                <Widget.Header>
                    <Widget.Title>
                        <Widget.Sortable className={this.props.sortable.handleClassName}>
                            <FontAwesomeIcon icon="bars" fixedWidth />
                            <Space width={4} />
                        </Widget.Sortable>
                        {isForkedWidget &&
                        <FontAwesomeIcon icon="code-branch" fixedWidth />
                        }
                        TinyG
                    </Widget.Title>
                    <Widget.Controls className={this.props.sortable.filterClassName}>
                        {isReady && (
                            <Widget.Button
                                onClick={(event) => {
                                    actions.openModal(MODAL_CONTROLLER);
                                }}
                            >
                                <i className="fa fa-info" />
                            </Widget.Button>
                        )}
                        {isReady && (
                            <Widget.DropdownButton
                                toggle={<i className="fa fa-th-large" />}
                            >
                                <Widget.DropdownMenuItem
                                    onSelect={() => controller.writeln('?')}
                                    disabled={!state.canClick}
                                >
                                    {i18n._('Status Report (?)')}
                                </Widget.DropdownMenuItem>
                                <Widget.DropdownMenuItem
                                    onSelect={() => {
                                        controller.writeln('!%'); // queue flush
                                        controller.writeln('{"qr":""}'); // queue report
                                    }}
                                    disabled={!state.canClick}
                                >
                                    {i18n._('Queue Flush (%)')}
                                </Widget.DropdownMenuItem>
                                <Widget.DropdownMenuItem
                                    onSelect={() => controller.write('\x04')}
                                    disabled={!state.canClick}
                                >
                                    {i18n._('Kill Job (^d)')}
                                </Widget.DropdownMenuItem>
                                <Widget.DropdownMenuItem
                                    onSelect={() => controller.command('unlock')}
                                    disabled={!state.canClick}
                                >
                                    {i18n._('Clear Alarm ($clear)')}
                                </Widget.DropdownMenuItem>
                                <Widget.DropdownMenuItem divider />
                                <Widget.DropdownMenuItem
                                    onSelect={() => controller.writeln('h')}
                                    disabled={!state.canClick}
                                >
                                    {i18n._('Help')}
                                </Widget.DropdownMenuItem>
                                <Widget.DropdownMenuItem
                                    onSelect={() => controller.writeln('$sys')}
                                    disabled={!state.canClick}
                                >
                                    {i18n._('Show System Settings')}
                                </Widget.DropdownMenuItem>
                                <Widget.DropdownMenuItem
                                    onSelect={() => controller.writeln('$$')}
                                    disabled={!state.canClick}
                                >
                                    {i18n._('Show All Settings')}
                                </Widget.DropdownMenuItem>
                                <Widget.DropdownMenuItem
                                    onSelect={() => controller.writeln('$test')}
                                    disabled={!state.canClick}
                                >
                                    {i18n._('List Self Tests')}
                                </Widget.DropdownMenuItem>
                                <Widget.DropdownMenuItem divider />
                                <Widget.DropdownMenuItem
                                    onSelect={() => controller.writeln('$defa=1')}
                                    disabled={!state.canClick}
                                >
                                    {i18n._('Restore Defaults')}
                                </Widget.DropdownMenuItem>
                            </Widget.DropdownButton>
                        )}
                        {isReady && (
                            <Widget.Button
                                disabled={isFullscreen}
                                title={minimized ? i18n._('Expand') : i18n._('Collapse')}
                                onClick={actions.toggleMinimized}
                            >
                                {minimized &&
                                <FontAwesomeIcon icon="chevron-down" fixedWidth />
                                }
                                {!minimized &&
                                <FontAwesomeIcon icon="chevron-up" fixedWidth />
                                }
                            </Widget.Button>
                        )}
                        <Widget.DropdownButton
                            title={i18n._('More')}
                            toggle={(
                                <FontAwesomeIcon icon="ellipsis-v" fixedWidth />
                            )}
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
                            <Widget.DropdownMenuItem eventKey="fullscreen" disabled={!isReady}>
                                <i
                                    className={classNames(
                                        'fa',
                                        'fa-fw',
                                        { 'fa-expand': !isFullscreen },
                                        { 'fa-compress': isFullscreen }
                                    )}
                                />
                                <Space width={8} />
                                {!isFullscreen ? i18n._('Enter Full Screen') : i18n._('Exit Full Screen')}
                            </Widget.DropdownMenuItem>
                            <Widget.DropdownMenuItem eventKey="fork">
                                <FontAwesomeIcon icon="code-branch" fixedWidth />
                                <Space width={8} />
                                {i18n._('Fork Widget')}
                            </Widget.DropdownMenuItem>
                            <Widget.DropdownMenuItem eventKey="remove">
                                <FontAwesomeIcon icon="times" fixedWidth />
                                <Space width={8} />
                                {i18n._('Remove Widget')}
                            </Widget.DropdownMenuItem>
                        </Widget.DropdownButton>
                    </Widget.Controls>
                </Widget.Header>
                {isReady && (
                    <Widget.Content
                        className={classNames(
                            styles.widgetContent,
                            { [styles.hidden]: minimized }
                        )}
                    >
                        {state.modal.name === MODAL_CONTROLLER &&
                        <Controller state={state} actions={actions} />
                        }
                        <TinyG
                            state={state}
                            actions={actions}
                        />
                    </Widget.Content>
                )}
            </Widget>
        );
    }
}

export default TinyGWidget;
