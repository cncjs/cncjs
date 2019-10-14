import cx from 'classnames';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import FontAwesomeIcon from 'app/components/FontAwesomeIcon';
import Space from 'app/components/Space';
import Widget from 'app/components/Widget';
import controller from 'app/lib/controller';
import i18n from 'app/lib/i18n';
import { WidgetConfigContext } from 'app/widgets/context';
import WidgetConfig from 'app/widgets/WidgetConfig';
import Custom from './Custom';
import Settings from './Settings';
import {
    MODAL_NONE,
    MODAL_SETTINGS
} from './constants';
import styles from './index.styl';

class CustomWidget extends Component {
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

    toggleDisabled = () => {
        this.setState(state => ({
            disabled: !state.disabled,
        }));
    };

    toggleFullscreen = () => {
        this.setState(state => ({
            minimized: state.isFullscreen ? state.minimized : false,
            isFullscreen: !state.isFullscreen,
        }));
    };

    toggleMinimized = () => {
        this.setState(state => ({
            minimized: !state.minimized,
        }));
    };

    action = {
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
        refreshContent: () => {
            if (this.content) {
                const forceGet = true;
                this.content.reload(forceGet);
            }
        }
    };

    controllerEvents = {
        'serialport:open': (options) => {
            const { port } = options;
            this.setState({ port: port });
        },
        'serialport:close': (options) => {
            const initialState = this.getInitialState();
            this.setState({ ...initialState });
        },
        'workflow:state': (workflowState) => {
            this.setState(state => ({
                workflow: {
                    state: workflowState
                }
            }));
        }
    };

    content = null;

    component = null;

    componentDidMount() {
        this.addControllerEvents();
    }

    componentWillUnmount() {
        this.removeControllerEvents();
    }

    componentDidUpdate(prevProps, prevState) {
        const {
            disabled,
            minimized,
            title,
            url
        } = this.state;

        this.config.set('disabled', disabled);
        this.config.set('minimized', minimized);
        this.config.set('title', title);
        this.config.set('url', url);
    }

    getInitialState() {
        return {
            minimized: this.config.get('minimized', false),
            isFullscreen: false,
            disabled: this.config.get('disabled'),
            title: this.config.get('title', ''),
            url: this.config.get('url', ''),
            port: controller.port,
            controller: {
                type: controller.type,
                state: controller.state
            },
            workflow: {
                state: controller.workflow.state
            },
            modal: {
                name: MODAL_NONE,
                params: {}
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

    render() {
        const { widgetId } = this.props;
        const { minimized, isFullscreen, disabled, title } = this.state;
        const isForkedWidget = widgetId.match(/\w+:[\w\-]+/);
        const config = this.config;
        const state = {
            ...this.state
        };
        const action = {
            ...this.action
        };

        return (
            <WidgetConfigContext.Provider value={this.config}>
                <Widget fullscreen={isFullscreen}>
                    <Widget.Header>
                        <Widget.Title
                            title={title}
                        >
                            <Widget.Sortable className={this.props.sortable.handleClassName}>
                                <FontAwesomeIcon icon="bars" fixedWidth />
                                <Space width={4} />
                            </Widget.Sortable>
                            {isForkedWidget &&
                            <FontAwesomeIcon icon="code-branch" fixedWidth />
                            }
                            {title}
                        </Widget.Title>
                        <Widget.Controls className={this.props.sortable.filterClassName}>
                            <Widget.Button
                                disabled={!state.url}
                                title={disabled ? i18n._('Enable') : i18n._('Disable')}
                                type="default"
                                onClick={this.toggleDisabled}
                            >
                                {disabled &&
                                <FontAwesomeIcon icon="toggle-off" fixedWidth />
                                }
                                {!disabled &&
                                <FontAwesomeIcon icon="toggle-on" fixedWidth />
                                }
                            </Widget.Button>
                            <Widget.Button
                                disabled={disabled}
                                title={i18n._('Refresh')}
                                onClick={action.refreshContent}
                            >
                                <FontAwesomeIcon icon="redo-alt" fixedWidth />
                            </Widget.Button>
                            <Widget.Button
                                disabled={isFullscreen}
                                title={minimized ? i18n._('Expand') : i18n._('Collapse')}
                                onClick={this.toggleMinimized}
                            >
                                {minimized &&
                                <FontAwesomeIcon icon="chevron-down" fixedWidth />
                                }
                                {!minimized &&
                                <FontAwesomeIcon icon="chevron-up" fixedWidth />
                                }
                            </Widget.Button>
                            {isFullscreen && (
                                <Widget.Button
                                    title={i18n._('Exit Full Screen')}
                                    onClick={this.toggleFullscreen}
                                >
                                    <FontAwesomeIcon icon="compress" fixedWidth />
                                </Widget.Button>
                            )}
                            <Widget.DropdownButton
                                title={i18n._('More')}
                                toggle={(
                                    <FontAwesomeIcon icon="ellipsis-v" fixedWidth />
                                )}
                                onSelect={(eventKey) => {
                                    if (eventKey === 'settings') {
                                        action.openModal(MODAL_SETTINGS);
                                    } else if (eventKey === 'fullscreen') {
                                        this.toggleFullscreen();
                                    } else if (eventKey === 'fork') {
                                        this.props.onFork();
                                    } else if (eventKey === 'remove') {
                                        this.props.onRemove();
                                    }
                                }}
                            >
                                <Widget.DropdownMenuItem eventKey="settings">
                                    <FontAwesomeIcon icon="cog" fixedWidth />
                                    <Space width={8} />
                                    {i18n._('Settings')}
                                </Widget.DropdownMenuItem>
                                <Widget.DropdownMenuItem eventKey="fullscreen">
                                    {!isFullscreen && (
                                        <FontAwesomeIcon icon="expand" fixedWidth />
                                    )}
                                    {isFullscreen && (
                                        <FontAwesomeIcon icon="compress" fixedWidth />
                                    )}
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
                    <Widget.Content
                        className={cx(styles.widgetContent, {
                            [styles.hidden]: minimized,
                            [styles.fullscreen]: isFullscreen
                        })}
                    >
                        {state.modal.name === MODAL_SETTINGS && (
                            <Settings
                                config={config}
                                onSave={() => {
                                    const title = config.get('title');
                                    const url = config.get('url');
                                    this.setState({
                                        title: title,
                                        url: url
                                    });
                                    action.closeModal();
                                }}
                                onCancel={action.closeModal}
                            />
                        )}
                        <Custom
                            ref={node => {
                                this.content = node;
                            }}
                            config={config}
                            disabled={state.disabled}
                            url={state.url}
                            port={state.port}
                        />
                    </Widget.Content>
                </Widget>
            </WidgetConfigContext.Provider>
        );
    }
}

export default CustomWidget;
