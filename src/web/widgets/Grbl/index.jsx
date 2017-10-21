import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Widget from '../../components/Widget';
import i18n from '../../lib/i18n';
import controller from '../../lib/controller';
import WidgetConfig from '../WidgetConfig';
import Grbl from './Grbl';
import Controller from './Controller';
import {
    GRBL
} from '../../constants';
import {
    MODAL_NONE,
    MODAL_CONTROLLER
} from './constants';
import styles from './index.styl';

class GrblWidget extends PureComponent {
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
        'connection:open': (options) => {
            const { ident } = options;
            this.setState(state => ({
                isReady: controller.type === GRBL,
                connection: {
                    ...state.connection,
                    ident: ident
                }
            }));
        },
        'connection:close': (options) => {
            const initialState = this.getInitialState();
            this.setState({ ...initialState });
        },
        'controller:settings': (type, controllerSettings) => {
            if (type === GRBL) {
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
            if (type === GRBL) {
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
        this.config.set('panel.queueReports.expanded', panel.queueReports.expanded);
        this.config.set('panel.statusReports.expanded', panel.statusReports.expanded);
        this.config.set('panel.modalGroups.expanded', panel.modalGroups.expanded);
    }
    getInitialState() {
        return {
            minimized: this.config.get('minimized', false),
            isFullscreen: false,
            isReady: (controller.availableControllers.length === 1) || (controller.type === GRBL),
            canClick: false,
            controller: {
                type: controller.type,
                settings: controller.settings,
                state: controller.state
            },
            connection: {
                ident: controller.connection.ident
            },
            modal: {
                name: MODAL_NONE,
                params: {}
            },
            panel: {
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
        if (controller.type !== GRBL) {
            return false;
        }
        if (!controller.connection.ident) {
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
                            <i className="fa fa-bars" />
                            <span className="space" />
                        </Widget.Sortable>
                        {isForkedWidget &&
                        <i className="fa fa-code-fork" style={{ marginRight: 5 }} />
                        }
                        Grbl
                    </Widget.Title>
                    <Widget.Controls className={this.props.sortable.filterClassName}>
                        {isReady &&
                        <Widget.Button
                            onClick={(event) => {
                                actions.openModal(MODAL_CONTROLLER);
                            }}
                        >
                            <i className="fa fa-info" />
                        </Widget.Button>
                        }
                        {isReady &&
                        <Widget.DropdownButton
                            toggle={<i className="fa fa-th-large" />}
                        >
                            <Widget.DropdownMenuItem
                                onSelect={() => controller.write('?')}
                                disabled={!state.canClick}
                            >
                                {i18n._('Status Report (?)')}
                            </Widget.DropdownMenuItem>
                            <Widget.DropdownMenuItem
                                onSelect={() => controller.writeln('$C')}
                                disabled={!state.canClick}
                            >
                                {i18n._('Check G-code Mode ($C)')}
                            </Widget.DropdownMenuItem>
                            <Widget.DropdownMenuItem
                                onSelect={() => controller.command('homing')}
                                disabled={!state.canClick}
                            >
                                {i18n._('Homing ($H)')}
                            </Widget.DropdownMenuItem>
                            <Widget.DropdownMenuItem
                                onSelect={() => controller.command('unlock')}
                                disabled={!state.canClick}
                            >
                                {i18n._('Kill Alarm Lock ($X)')}
                            </Widget.DropdownMenuItem>
                            <Widget.DropdownMenuItem
                                onSelect={() => controller.command('sleep')}
                                disabled={!state.canClick}
                            >
                                {i18n._('Sleep ($SLP)')}
                            </Widget.DropdownMenuItem>
                            <Widget.DropdownMenuItem divider />
                            <Widget.DropdownMenuItem
                                onSelect={() => controller.writeln('$')}
                                disabled={!state.canClick}
                            >
                                {i18n._('Help ($)')}
                            </Widget.DropdownMenuItem>
                            <Widget.DropdownMenuItem
                                onSelect={() => controller.writeln('$$')}
                                disabled={!state.canClick}
                            >
                                {i18n._('Settings ($$)')}
                            </Widget.DropdownMenuItem>
                            <Widget.DropdownMenuItem
                                onSelect={() => controller.writeln('$#')}
                                disabled={!state.canClick}
                            >
                                {i18n._('View G-code Parameters ($#)')}
                            </Widget.DropdownMenuItem>
                            <Widget.DropdownMenuItem
                                onSelect={() => controller.writeln('$G')}
                                disabled={!state.canClick}
                            >
                                {i18n._('View G-code Parser State ($G)')}
                            </Widget.DropdownMenuItem>
                            <Widget.DropdownMenuItem
                                onSelect={() => controller.writeln('$I')}
                                disabled={!state.canClick}
                            >
                                {i18n._('View Build Info ($I)')}
                            </Widget.DropdownMenuItem>
                            <Widget.DropdownMenuItem
                                onSelect={() => controller.writeln('$N')}
                                disabled={!state.canClick}
                            >
                                {i18n._('View Startup Blocks ($N)')}
                            </Widget.DropdownMenuItem>
                        </Widget.DropdownButton>
                        }
                        {isReady &&
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
                        }
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
                            <Widget.DropdownMenuItem eventKey="fullscreen" disabled={!isReady}>
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
                {isReady &&
                <Widget.Content
                    className={classNames(
                        styles['widget-content'],
                        { [styles.hidden]: minimized }
                    )}
                >
                    {state.modal.name === MODAL_CONTROLLER &&
                    <Controller state={state} actions={actions} />
                    }
                    <Grbl
                        state={state}
                        actions={actions}
                    />
                </Widget.Content>
                }
            </Widget>
        );
    }
}

export default GrblWidget;
