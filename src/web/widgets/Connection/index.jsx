import _ from 'lodash';
import classNames from 'classnames';
import React, { Component, PropTypes } from 'react';
import CSSModules from 'react-css-modules';
import Widget from '../../components/Widget';
import i18n from '../../lib/i18n';
import store from '../../store';
import Connection from './Connection';
import styles from './index.styl';

@CSSModules(styles, { allowMultiple: true })
class ConnectionWidget extends Component {
    static propTypes = {
        sortable: PropTypes.object
    };

    state = {
        minimized: store.get('widgets.connection.minimized', false),
        isFullscreen: false
    };

    shouldComponentUpdate(nextProps, nextState) {
        return !_.isEqual(nextProps, this.props) || !_.isEqual(nextState, this.state);
    }
    componentDidUpdate(prevProps, prevState) {
        const {
            minimized
        } = this.state;

        store.set('widgets.connection.minimized', minimized);
    }
    render() {
        const { minimized, isFullscreen } = this.state;

        return (
            <Widget fullscreen={isFullscreen}>
                <Widget.Header className={this.props.sortable.handleClassName}>
                    <Widget.Title>{i18n._('Connection')}</Widget.Title>
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
                    </Widget.Controls>
                </Widget.Header>
                <Widget.Content
                    styleName={classNames(
                        'widget-content',
                        { 'hidden': minimized }
                    )}
                >
                    <Connection />
                </Widget.Content>
            </Widget>
        );
    }
}

export default ConnectionWidget;
