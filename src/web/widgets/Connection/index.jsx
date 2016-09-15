import _ from 'lodash';
import classNames from 'classnames';
import React, { Component } from 'react';
import CSSModules from 'react-css-modules';
import Widget from '../../components/Widget';
import i18n from '../../lib/i18n';
import Connection from './Connection';
import styles from './index.styl';

@CSSModules(styles, { allowMultiple: true })
class ConnectionWidget extends Component {
    state = {
        isCollapsed: false,
        isFullscreen: false
    };

    shouldComponentUpdate(nextProps, nextState) {
        return !_.isEqual(nextProps, this.props) || !_.isEqual(nextState, this.state);
    }
    render() {
        const { isCollapsed, isFullscreen } = this.state;

        return (
            <Widget fullscreen={isFullscreen}>
                <Widget.Header>
                    <Widget.Title>{i18n._('Connection')}</Widget.Title>
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
                    </Widget.Controls>
                </Widget.Header>
                <Widget.Content
                    styleName={classNames(
                        'widget-content',
                        { 'hidden': isCollapsed }
                    )}
                >
                    <Connection />
                </Widget.Content>
            </Widget>
        );
    }
}

export default ConnectionWidget;
