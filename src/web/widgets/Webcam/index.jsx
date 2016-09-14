import _ from 'lodash';
import classNames from 'classnames';
import React, { Component, PropTypes } from 'react';
import CSSModules from 'react-css-modules';
import Widget from '../../components/Widget';
import i18n from '../../lib/i18n';
import store from '../../store';
import Webcam from './Webcam';
import * as Settings from './Settings';
import styles from './index.styl';
import {
    MEDIA_SOURCE_LOCAL
} from './constants';

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
        const {
            disabled,
            mediaSource,
            url,
            crosshair,
            scale
        } = this.state;

        store.set('widgets.webcam.disabled', disabled);
        store.set('widgets.webcam.mediaSource', mediaSource);
        store.set('widgets.webcam.url', url);
        store.set('widgets.webcam.crosshair', crosshair);
        store.set('widgets.webcam.scale', scale);
    }
    getDefaultState() {
        return {
            isCollapsed: false,
            isFullscreen: false,
            disabled: store.get('widgets.webcam.disabled'),
            mediaSource: store.get('widgets.webcam.mediaSource', MEDIA_SOURCE_LOCAL),
            url: store.get('widgets.webcam.url'),
            crosshair: store.get('widgets.webcam.crosshair'),
            scale: store.get('widgets.webcam.scale')
        };
    }
    changeImageScale(value) {
        this.setState({ scale: value });
    }
    toggleCrosshair() {
        const { crosshair } = this.state;
        this.setState({ crosshair: !crosshair });
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
            changeImageScale: ::this.changeImageScale,
            toggleCrosshair: ::this.toggleCrosshair
        };

        return (
            <Widget fullscreen={isFullscreen}>
                <Widget.Header>
                    <Widget.Title>{i18n._('Webcam')}</Widget.Title>
                    <Widget.Controls>
                        <Widget.Button
                            type="edit"
                            onClick={(event) => {
                                const options = {
                                    mediaSource: this.state.mediaSource,
                                    url: this.state.url
                                };

                                Settings.show(options)
                                    .then(data => {
                                        const { mediaSource, url } = data;
                                        this.setState({ mediaSource, url });
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
                            <i className={classes.webcamOnOff} />
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
        );
    }
}

export default WebcamWidget;
