import classNames from 'classnames';
import pubsub from 'pubsub-js';
import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import Widget from '../../components/Widget';
import i18n from '../../lib/i18n';
import confirm from '../../lib/confirm';
import controller from '../../lib/controller';
import store from '../../store';
import Grbl from './Grbl';
import {
    GRBL
} from '../../constants';
import {
    MODAL_NONE
} from './constants';
import styles from './index.styl';

class GrblWidget extends Component {
    static propTypes = {
        onDelete: PropTypes.func,
        sortable: PropTypes.object
    };
    static defaultProps = {
        onDelete: () => {}
    };

    actions = {
        toggleFullscreen: () => {
            const { isFullscreen } = this.state;
            this.setState({ isFullscreen: !isFullscreen });
        },
        toggleMinimized: () => {
            const { minimized } = this.state;
            this.setState({ minimized: !minimized });
        },
        deleteWidget: () => {
            confirm({
                title: i18n._('Delete Widget'),
                body: i18n._('Are you sure you want to delete this widget?')
            }).then(() => {
                this.props.onDelete();
            });
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
        'serialport:open': (options) => {
            const { controllerType } = options;
            this.setState({ isReady: controllerType === GRBL });
        },
        'serialport:close': (options) => {
            this.setState({ isReady: true });
        },
        'Grbl:state': (state) => {
            this.setState({
                controller: {
                    type: GRBL,
                    state: state
                }
            });
        }
    };
    pubsubTokens = [];

    constructor() {
        super();
        this.state = this.getInitialState();
    }
    componentDidMount() {
        this.subscribe();
        this.addControllerEvents();
    }
    componentWillUnmount() {
        this.unsubscribe();
        this.removeControllerEvents();
    }
    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
    componentDidUpdate(prevProps, prevState) {
        const {
            minimized,
            panel
        } = this.state;

        store.set('widgets.grbl.minimized', minimized);
        store.set('widgets.grbl.panel.queueReports.expanded', panel.queueReports.expanded);
        store.set('widgets.grbl.panel.statusReports.expanded', panel.statusReports.expanded);
        store.set('widgets.grbl.panel.modalGroups.expanded', panel.modalGroups.expanded);
    }
    getInitialState() {
        return {
            minimized: store.get('widgets.grbl.minimized', false),
            isFullscreen: false,
            isReady: controller.type === GRBL,
            canClick: true, // Defaults to true
            port: controller.port,
            controller: {
                type: controller.type,
                state: controller.state
            },
            modal: {
                name: MODAL_NONE,
                params: {}
            },
            panel: {
                queueReports: {
                    expanded: store.get('widgets.grbl.panel.queueReports.expanded')
                },
                statusReports: {
                    expanded: store.get('widgets.grbl.panel.statusReports.expanded')
                },
                modalGroups: {
                    expanded: store.get('widgets.grbl.panel.modalGroups.expanded')
                }
            }
        };
    }
    subscribe() {
        const tokens = [
            pubsub.subscribe('port', (msg, port) => {
                port = port || '';

                if (port) {
                    this.setState({ port: port });
                } else {
                    const initialState = this.getInitialState();
                    this.setState({
                        ...initialState,
                        port: ''
                    });
                }
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
            controller.on(eventName, callback);
        });
    }
    removeControllerEvents() {
        Object.keys(this.controllerEvents).forEach(eventName => {
            const callback = this.controllerEvents[eventName];
            controller.off(eventName, callback);
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
        const { minimized, isFullscreen, isReady } = this.state;
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
                        Grbl
                    </Widget.Title>
                    <Widget.Controls className={this.props.sortable.filterClassName}>
                        {isReady &&
                        <Widget.Button
                            title={minimized ? i18n._('Open') : i18n._('Close')}
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
                        {isReady &&
                        <Widget.Button
                            title={i18n._('Fullscreen')}
                            onClick={actions.toggleFullscreen}
                        >
                            <i
                                className={classNames(
                                    'fa',
                                    { 'fa-expand': !isFullscreen },
                                    { 'fa-compress': isFullscreen }
                                )}
                            />
                        </Widget.Button>
                        }
                        <Widget.Button
                            title={i18n._('Remove')}
                            onClick={actions.deleteWidget}
                        >
                            <i className="fa fa-times" />
                        </Widget.Button>
                    </Widget.Controls>
                </Widget.Header>
                {isReady &&
                <Widget.Content
                    className={classNames(
                        styles['widget-content'],
                        { [styles.hidden]: minimized }
                    )}
                >
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
