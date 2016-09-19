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
        onDelete: PropTypes.func,
        sortable: PropTypes.object
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
            minimized,
            disabled,
            mediaSource,
            url,
            crosshair,
            scale
        } = this.state;

        store.set('widgets.webcam.minimized', minimized);
        store.set('widgets.webcam.disabled', disabled);
        store.set('widgets.webcam.mediaSource', mediaSource);
        store.set('widgets.webcam.url', url);
        store.set('widgets.webcam.crosshair', crosshair);
        store.set('widgets.webcam.scale', scale);
    }
    getDefaultState() {
        return {
            minimized: store.get('widgets.webcam.minimized', false),
            isFullscreen: false,
            disabled: store.get('widgets.webcam.disabled', true),
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
        const { disabled, minimized, isFullscreen } = this.state;
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
                <Widget.Header className={this.props.sortable.handleClassName}>
                    <Widget.Title>{i18n._('Webcam')}</Widget.Title>
                    <Widget.Controls className={this.props.sortable.filterClassName}>
                        <Widget.Button
                            title={i18n._('Edit')}
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
                        >
                            <i className="fa fa-cog" />
                        </Widget.Button>
                        <Widget.Button
                            title={i18n._('Refresh')}
                            onClick={(event) => this.refs.webcam.refresh()}
                        >
                            <i className="fa fa-refresh" />
                        </Widget.Button>
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
                        { 'hidden': minimized },
                        { 'fullscreen': isFullscreen }
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
