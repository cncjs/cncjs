import _ from 'lodash';
import classNames from 'classnames';
import pubsub from 'pubsub-js';
import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import CSSModules from 'react-css-modules';
import Widget from '../../components/Widget';
import controller from '../../lib/controller';
import i18n from '../../lib/i18n';
import Console from './Console';
import {
    SCROLL_BUFFER_SIZE
} from './constants';
import styles from './index.styl';

@CSSModules(styles, { allowMultiple: true })
class ConsoleWidget extends Component {
    static propTypes = {
        onDelete: PropTypes.func,
        sortableHandleClassName: PropTypes.string
    };
    static defaultProps = {
        onDelete: () => {}
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
        return !_.isEqual(nextProps, this.props) || !_.isEqual(nextState, this.state);
    }
    getDefaultState() {
        return {
            isCollapsed: false,
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
        _.each(this.pubsubTokens, (token) => {
            pubsub.unsubscribe(token);
        });
        this.pubsubTokens = [];
    }
    addControllerEvents() {
        _.each(this.controllerEvents, (eventHandler, eventName) => {
            controller.on(eventName, eventHandler);
        });
    }
    removeControllerEvents() {
        _.each(this.controllerEvents, (eventHandler, eventName) => {
            controller.off(eventName, eventHandler);
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
        const { sortableHandleClassName } = this.props;
        const { isCollapsed, isFullscreen } = this.state;
        const state = {
            ...this.state
        };
        const actions = {
            getWidgetContentEl: () => {
                const widgetContentEl = ReactDOM.findDOMNode(this.widgetContent);
                return widgetContentEl;
            },
            setContainerHeight: (containerHeight) => {
                this.setState({ containerHeight: containerHeight });
            },
            clearAll: ::this.clearAll
        };

        return (
            <Widget fullscreen={isFullscreen}>
                <Widget.Header className={sortableHandleClassName}>
                    <Widget.Title>{i18n._('Console')}</Widget.Title>
                    <Widget.Controls>
                        <Widget.Button
                            title={i18n._('Expand/Collapse')}
                            onClick={(event, val) => this.setState({ isCollapsed: !isCollapsed })}
                        >
                            <i
                                className={classNames(
                                    'fa',
                                    { 'fa-chevron-up': !isCollapsed },
                                    { 'fa-chevron-down': isCollapsed }
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
                    ref={node => {
                        this.widgetContent = node;
                    }}
                    styleName={classNames(
                        'widget-content',
                        { 'hidden': isCollapsed },
                        { 'fullscreen': isFullscreen }
                    )}
                >
                    <Console
                        state={state}
                        actions={actions}
                    />
                </Widget.Content>
            </Widget>
        );
    }
}

export default ConsoleWidget;
