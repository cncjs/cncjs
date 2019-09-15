import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import FontAwesomeIcon from 'app/components/FontAwesomeIcon';
import Space from 'app/components/Space';
import Widget from 'app/components/Widget';
import i18n from 'app/lib/i18n';
import controller from 'app/lib/controller';
import WidgetConfig from 'app/widgets/WidgetConfig';
import {
    GRBL
} from 'app/constants';
import Controller from './Controller';
import Grbl from './Grbl';
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
    };

    controllerEvents = {
        'serialport:open': (options) => {
            const { port, controllerType } = options;
            this.setState({
                isReady: controllerType === GRBL,
                port: port
            });
        },
        'serialport:close': (options) => {
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
        } = this.state;

        this.config.set('minimized', minimized);
    }

    getInitialState() {
        return {
            minimized: this.config.get('minimized', false),
            isFullscreen: false,
            isReady: (controller.loadedControllers.length === 1) || (controller.type === GRBL),
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
        if (type !== GRBL) {
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
                        Grbl
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
                            styles['widget-content'],
                            { [styles.hidden]: minimized }
                        )}
                    >
                        {state.modal.name === MODAL_CONTROLLER &&
                        <Controller state={state} actions={actions} />
                        }
                        <Grbl
                            config={this.config}
                            state={state}
                        />
                    </Widget.Content>
                )}
            </Widget>
        );
    }
}

export default GrblWidget;
