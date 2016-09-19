import _ from 'lodash';
import classNames from 'classnames';
import pubsub from 'pubsub-js';
import React, { Component, PropTypes } from 'react';
import CSSModules from 'react-css-modules';
import Widget from '../../components/Widget';
import i18n from '../../lib/i18n';
import controller from '../../lib/controller';
import store from '../../store';
import TinyG2 from './TinyG2';
import {
    TINYG2
} from '../../constants';
import styles from './index.styl';

@CSSModules(styles, { allowMultiple: true })
class TinyG2Widget extends Component {
    static propTypes = {
        onDelete: PropTypes.func,
        sortable: PropTypes.object
    };
    static defaultProps = {
        onDelete: () => {}
    };

    controllerEvents = {
        'TinyG2:state': (state) => {
            this.setState({
                controller: {
                    type: TINYG2,
                    state: state
                }
            });
        }
    };
    pubsubTokens = [];

    constructor() {
        super();
        this.state = this.getDefaultState();
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
        return !_.isEqual(nextProps, this.props) || !_.isEqual(nextState, this.state);
    }
    componentDidUpdate(prevProps, prevState) {
        const {
            minimized,
            panel
        } = this.state;

        store.set('widgets.tinyg2.minimized', minimized);
        store.set('widgets.tinyg2.panel.queueReports.expanded', panel.queueReports.expanded);
        store.set('widgets.tinyg2.panel.statusReports.expanded', panel.statusReports.expanded);
        store.set('widgets.tinyg2.panel.modalGroups.expanded', panel.modalGroups.expanded);
    }
    getDefaultState() {
        return {
            minimized: store.get('widgets.tinyg2.minimized', false),
            isFullscreen: false,
            canClick: true, // Defaults to true
            port: controller.port,
            controller: {
                type: controller.type,
                state: controller.state
            },
            panel: {
                queueReports: {
                    expanded: store.get('widgets.tinyg2.panel.queueReports.expanded')
                },
                statusReports: {
                    expanded: store.get('widgets.tinyg2.panel.statusReports.expanded')
                },
                modalGroups: {
                    expanded: store.get('widgets.tinyg2.panel.modalGroups.expanded')
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
                    const defaultState = this.getDefaultState();
                    this.setState({
                        ...defaultState,
                        port: ''
                    });
                }
            })
        ];
        this.pubsubTokens = this.pubsubTokens.concat(tokens);
    }
    unsubscribe() {
        _.each(this.pubsubTokens, (token) => {
            pubsub.unsubscribe(token);
        });
        this.pubsubTokens = [];
    }
    addControllerEvents() {
        _.each(this.controllerEvents, (callback, eventName) => {
            controller.on(eventName, callback);
        });
    }
    removeControllerEvents() {
        _.each(this.controllerEvents, (callback, eventName) => {
            controller.off(eventName, callback);
        });
    }
    canClick() {
        const { port } = this.state;
        const { type } = this.state.controller;

        if (!port) {
            return false;
        }
        if (type !== TINYG2) {
            return false;
        }

        return true;
    }
    toggleQueueReports() {
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
    }
    toggleStatusReports() {
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
    }
    toggleModalGroups() {
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
    render() {
        const { minimized, isFullscreen } = this.state;
        const state = {
            ...this.state,
            canClick: this.canClick()
        };
        const actions = {
            toggleQueueReports: ::this.toggleQueueReports,
            toggleStatusReports: ::this.toggleStatusReports,
            toggleModalGroups: ::this.toggleModalGroups
        };

        return (
            <Widget fullscreen={isFullscreen}>
                <Widget.Header className={this.props.sortable.handleClassName}>
                    <Widget.Title>{i18n._('TinyG2')}</Widget.Title>
                    <Widget.Controls className={this.props.sortable.filterClassName}>
                        <Widget.Button
                            title={i18n._('Expand/Collapse')}
                            onClick={(event, val) => this.setState({ minimized: !minimized })}
                        >
                            <i
                                className={classNames(
                                    'fa',
                                    { 'fa-chevron-up': !minimized },
                                    { 'fa-chevron-down': minimized }
                                )}
                            />
                        </Widget.Button>
                        <Widget.Button
                            title={i18n._('Fullscreen')}
                            onClick={(event, val) => this.setState({ isFullscreen: !isFullscreen })}
                        >
                            <i
                                className={classNames(
                                    'fa',
                                    { 'fa-expand': !isFullscreen },
                                    { 'fa-compress': isFullscreen }
                                )}
                            />
                        </Widget.Button>
                        <Widget.Button
                            title={i18n._('Delete')}
                            onClick={(event) => this.props.onDelete()}
                        >
                            <i className="fa fa-times" />
                        </Widget.Button>
                    </Widget.Controls>
                </Widget.Header>
                <Widget.Content
                    styleName={classNames(
                        'widget-content',
                        { 'hidden': minimized }
                    )}
                >
                    <TinyG2
                        state={state}
                        actions={actions}
                    />
                </Widget.Content>
            </Widget>
        );
    }
}

export default TinyG2Widget;
