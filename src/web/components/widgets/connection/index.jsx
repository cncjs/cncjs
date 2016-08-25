import _ from 'lodash';
import classNames from 'classnames';
import React, { Component } from 'react';
import CSSModules from 'react-css-modules';
import i18n from '../../../lib/i18n';
import Widget from '../../widget';
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
            <div {...this.props} data-ns="widgets/connection">
                <Widget fullscreen={isFullscreen}>
                    <Widget.Header>
                        <Widget.Title>{i18n._('Connection')}</Widget.Title>
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
            </div>
        );
    }
}

export default ConnectionWidget;
