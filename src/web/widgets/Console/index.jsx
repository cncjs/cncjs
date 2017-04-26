import _ from 'lodash';
import classNames from 'classnames';
import pubsub from 'pubsub-js';
import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import shallowCompare from 'react-addons-shallow-compare';
import Widget from '../../components/Widget';
import confirm from '../../lib/confirm';
import controller from '../../lib/controller';
import i18n from '../../lib/i18n';
import store from '../../store';
import Console from './Console';
import {
    SCROLL_BUFFER_SIZE
} from './constants';
import styles from './index.styl';

class ConsoleWidget extends Component {
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
        getContainerEl: () => {
            return ReactDOM.findDOMNode(this.container);
        },
        setContainerHeight: (containerHeight) => {
            if (containerHeight > 0) {
                this.setState({ containerHeight: containerHeight });
            }
        },
        clearAll: () => {
            this.clearAll();
        }
    };
    controllerEvents = {
        'serialport:write': (data) => {
            const lines = data.split('\n');
            const values = _(lines)
                .compact()
                .map((line) => ('> ' + line))
                .value();
            this.appendLine(values);
        },
        'serialport:read': (data) => {
            this.appendLine(data);
        }
    };
    pubsubTokens = [];
    lineBuffers = [];
    throttledTimer = null;
    container = null;

    constructor() {
        super();
        this.state = this.getDefaultState();
    }
    componentDidMount() {
        this.subscribe();
        this.addControllerEvents();

        this.throttledTimer = setInterval(() => {
            if (this.state.lines !== this.lineBuffers) {
                this.setState({ lines: this.lineBuffers });
            }
        }, 500);
    }
    componentWillUnmount() {
        if (this.throttledTimer) {
            clearInterval(this.throttledTimer);
            this.timer = null;
        }
        this.unsubscribe();
        this.removeControllerEvents();
    }
    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
    componentDidUpdate(prevProps, prevState) {
        const {
            minimized
        } = this.state;

        store.set('widgets.console.minimized', minimized);
    }
    getDefaultState() {
        return {
            minimized: store.get('widgets.console.minimized', false),
            isFullscreen: false,
            port: controller.port,
            containerHeight: 240,
            lines: []
        };
    }
    subscribe() {
        const tokens = [
            pubsub.subscribe('port', (msg, port) => {
                port = port || '';

                if (port) {
                    this.setState({ port: port });
                } else {
                    this.clearAll();

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
    appendLine(line) {
        this.lineBuffers = _(this.lineBuffers)
            .concat(line)
            .slice(0, SCROLL_BUFFER_SIZE)
            .value();
    }
    clearAll() {
        this.lineBuffers = [];
    }
    render() {
        const { minimized, isFullscreen } = this.state;
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
                        {i18n._('Console')}
                    </Widget.Title>
                    <Widget.Controls className={this.props.sortable.filterClassName}>
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
                        <Widget.Button
                            title={i18n._('Remove')}
                            onClick={actions.deleteWidget}
                        >
                            <i className="fa fa-times" />
                        </Widget.Button>
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
                            this.container = node;
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
