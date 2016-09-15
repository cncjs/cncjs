import _ from 'lodash';
import classNames from 'classnames';
import pubsub from 'pubsub-js';
import React, { Component, PropTypes } from 'react';
import CSSModules from 'react-css-modules';
import Widget from '../../components/Widget';
import controller from '../../lib/controller';
import i18n from '../../lib/i18n';
import Spindle from './Spindle';
import styles from './index.styl';

@CSSModules(styles, { allowMultiple: true })
class SpindleWidget extends Component {
    static propTypes = {
        onDelete: PropTypes.func
    };
    static defaultProps = {
        onDelete: () => {}
    };

    pubsubTokens = [];

    constructor() {
        super();
        this.state = this.getDefaultState();
    }
    componentDidMount() {
        this.subscribe();
    }
    componentWillUnmount() {
        this.unsubscribe();
    }
    shouldComponentUpdate(nextProps, nextState) {
        return !_.isEqual(nextProps, this.props) || !_.isEqual(nextState, this.state);
    }
    getDefaultState() {
        return {
            isCollapsed: false,
            isFullscreen: false,
            canClick: true, // Defaults to true
            port: controller.port,
            isCCWChecked: false,
            spindleSpeed: 0
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
    canClick() {
        const { port } = this.state;

        if (!port) {
            return false;
        }

        return true;
    }
    handleCCWChange() {
        this.setState({
            isCCWChecked: !(this.state.isCCWChecked)
        });
    }
    render() {
        const { isCollapsed, isFullscreen } = this.state;
        const state = {
            ...this.state,
            canClick: this.canClick()
        };
        const actions = {
            handleCCWChange: ::this.handleCCWChange
        };

        return (
            <Widget fullscreen={isFullscreen}>
                <Widget.Header>
                    <Widget.Title>{i18n._('Spindle')}</Widget.Title>
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
                    styleName={classNames(
                        'widget-content',
                        { 'hidden': isCollapsed }
                    )}
                >
                    <Spindle
                        state={state}
                        actions={actions}
                    />
                </Widget.Content>
            </Widget>
        );
    }
}

export default SpindleWidget;
