import _ from 'lodash';
import classNames from 'classnames';
import React, { Component, PropTypes } from 'react';
import CSSModules from 'react-css-modules';
import i18n from '../../../lib/i18n';
import store from '../../../store';
import Widget from '../../widget';
import Webcam from './Webcam';
import { show as editSettings } from './Settings';
import styles from './index.styl';

@CSSModules(styles, { allowMultiple: true })
class WebcamWidget extends Component {
    static propTypes = {
        onDelete: PropTypes.func
    };
    static defaultProps = {
        onDelete: () => {}
    };

    constructor() {
        super();
        this.state = this.getDefaultState();
    }
    shouldComponentUpdate(nextProps, nextState) {
        return !_.isEqual(nextProps, this.props) || !_.isEqual(nextState, this.state);
    }
    componentDidUpdate(prevProps, prevState) {
        const { disabled, url } = this.state;

        store.set('widgets.webcam.disabled', disabled);
        store.set('widgets.webcam.url', url);
    }
    getDefaultState() {
        return {
            isCollapsed: false,
            isFullscreen: false,
            disabled: store.get('widgets.webcam.disabled'),
            url: store.get('widgets.webcam.url')
        };
    }
    render() {
        const { disabled, isCollapsed, isFullscreen } = this.state;
        const classes = {
            webcamOnOff: classNames(
                'fa',
                { 'fa-toggle-on': !disabled },
                { 'fa-toggle-off': disabled }
            )
        };

        const state = {
            ...this.state
        };
        const actions = {
        };

        return (
            <div {...this.props} data-ns="widgets/webcam">
                <Widget fullscreen={isFullscreen}>
                    <Widget.Header>
                        <Widget.Title>{i18n._('Webcam')}</Widget.Title>
                        <Widget.Controls>
                            <Widget.Button
                                type="edit"
                                onClick={(event) => {
                                    const { url } = this.state;
                                    editSettings({ url }, ({ url }) => {
                                        this.setState({ url: url });
                                    });
                                }}
                            />
                            <Widget.Button
                                type="refresh"
                                onClick={(event) => this.refs.webcam.refresh()}
                            />
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
                        <Widget.Toolbar>
                            <Widget.Button
                                type="default"
                                onClick={(event) => this.setState({ disabled: !disabled })}
                            >
                                <i className={classes.webcamOnOff}></i>
                            </Widget.Button>
                        </Widget.Toolbar>
                    </Widget.Header>
                    <Widget.Content
                        styleName={classNames(
                            'widget-content',
                            { 'hidden': isCollapsed }
                        )}
                    >
                        <Webcam
                            ref="webcam"
                            state={state}
                            actions={actions}
                        />
                    </Widget.Content>
                </Widget>
            </div>
        );
    }
}

export default WebcamWidget;
