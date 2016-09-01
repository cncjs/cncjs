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
        onDelete: PropTypes.func
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
        if (prevState.panel.queueReports.expanded !== this.state.panel.queueReports.expanded) {
            store.set('widgets.tinyg2.panel.queueReports.expanded', this.state.panel.queueReports.expanded);
        }
        if (prevState.panel.statusReports.expanded !== this.state.panel.statusReports.expanded) {
            store.set('widgets.tinyg2.panel.statusReports.expanded', this.state.panel.statusReports.expanded);
        }
        if (prevState.panel.modalGroups.expanded !== this.state.panel.modalGroups.expanded) {
            store.set('widgets.tinyg2.panel.modalGroups.expanded', this.state.panel.modalGroups.expanded);
        }
    }
    getDefaultState() {
        return {
            isCollapsed: false,
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
        const { isCollapsed, isFullscreen } = this.state;
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
            <div {...this.props} data-ns="widgets/grbl">
                <Widget fullscreen={isFullscreen}>
                    <Widget.Header>
                        <Widget.Title>{i18n._('TinyG2')}</Widget.Title>
                        <Widget.Controls>
                            <Widget.Button
                                type="toggle"
                                defaultValue={isCollapsed}
                                onClick={(event, val) => this.setState({ isCollapsed: !!val })}
                            />
                            <Widget.Button
                                type="fullscreen"
                                defaultValue={isFullscreen}
                                onClick={(event, val) => this.setState({ isFullscreen: !!val })}
                            />
                            <Widget.Button
                                type="delete"
                                onClick={(event) => this.props.onDelete()}
                            />
                        </Widget.Controls>
                    </Widget.Header>
                    <Widget.Content
                        styleName={classNames(
                            'widget-content',
                            { 'hidden': isCollapsed }
                        )}
                    >
                        <TinyG2
                            state={state}
                            actions={actions}
                        />
                    </Widget.Content>
                </Widget>
            </div>
        );
    }
}

export default TinyG2Widget;
