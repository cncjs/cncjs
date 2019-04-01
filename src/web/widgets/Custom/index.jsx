import cx from 'classnames';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Space from 'web/components/Space';
import Widget from 'web/components/Widget';
import controller from 'web/lib/controller';
import i18n from 'web/lib/i18n';
import WidgetConfig from '../WidgetConfig';
import Custom from './Custom';
import Settings from './Settings';
import {
    MODAL_NONE,
    MODAL_SETTINGS
} from './constants';
import styles from './index.styl';

class CustomWidget extends PureComponent {
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
    action = {
        toggleDisabled: () => {
            const { disabled } = this.state;
            this.setState({ disabled: !disabled });
        },
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
        const buttonWidth = 30;
        const buttonCount = 5; // [Disabled] [Refresh] [Edit] [Toggle] [More]

        return (
            <Widget fullscreen={isFullscreen}>
                <Widget.Header>
                    <Widget.Title
                        style={{ width: `calc(100% - ${buttonWidth * buttonCount}px)` }}
                        title={title}
                    >
                        <Widget.Sortable className={this.props.sortable.handleClassName}>
                            <i className="fa fa-bars" />
                            <Space width="8" />
                        </Widget.Sortable>
                        {isForkedWidget &&
                        <i className="fa fa-code-fork" style={{ marginRight: 5 }} />
                        }
                        {title}
                    </Widget.Title>
                    <Widget.Controls className={this.props.sortable.filterClassName}>
                        <Widget.Button
                            disabled={!state.url}
                            title={disabled ? i18n._('Enable') : i18n._('Disable')}
                            type="default"
                            onClick={action.toggleDisabled}
                        >
                            <i
                                className={cx('fa', {
                                    'fa-toggle-on': !disabled,
                                    'fa-toggle-off': disabled
                                })}
                            />
                        </Widget.Button>
                        <Widget.Button
                            disabled={disabled}
                            title={i18n._('Refresh')}
                            onClick={action.refreshContent}
                        >
                            <i className="fa fa-refresh" />
                        </Widget.Button>
                        <Widget.Button
                            title={i18n._('Edit')}
                            onClick={() => {
                                action.openModal(MODAL_SETTINGS);
                            }}
                        >
                            <i className="fa fa-cog" />
                        </Widget.Button>
                        <Widget.Button
                            disabled={isFullscreen}
                            title={minimized ? i18n._('Expand') : i18n._('Collapse')}
                            onClick={action.toggleMinimized}
                        >
                            <i
                                className={cx(
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
                                    action.toggleFullscreen();
                                } else if (eventKey === 'fork') {
                                    this.props.onFork();
                                } else if (eventKey === 'remove') {
                                    this.props.onRemove();
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
                    className={cx(styles.widgetContent, {
                        [styles.hidden]: minimized,
                        [styles.fullscreen]: isFullscreen
                    })}
                >
                    {state.modal.name === MODAL_SETTINGS &&
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
                    }
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
        );
    }
}

export default CustomWidget;
