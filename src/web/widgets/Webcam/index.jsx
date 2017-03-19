import classNames from 'classnames';
import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import Widget from '../../components/Widget';
import i18n from '../../lib/i18n';
import store from '../../store';
import Webcam from './Webcam';
import * as Settings from './Settings';
import styles from './index.styl';
import {
    MEDIA_SOURCE_LOCAL
} from './constants';

class WebcamWidget extends Component {
    static propTypes = {
        onDelete: PropTypes.func,
        sortable: PropTypes.object
    };
    static defaultProps = {
        onDelete: () => {}
    };

    actions = {
        changeImageScale: (value) => {
            this.setState({ scale: value });
        },
        toggleCenterFocus: () => {
            const { centerFocus } = this.state;
            this.setState({ centerFocus: !centerFocus });
        },
        toggleFlipHorizontally: () => {
            const { flipHorizontally } = this.state;
            this.setState({ flipHorizontally: !flipHorizontally });
        },
        toggleFlipVertically: () => {
            const { flipVertically } = this.state;
            this.setState({ flipVertically: !flipVertically });
        }
    };

    constructor() {
        super();
        this.state = this.getInitialState();
    }
    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
    componentDidUpdate(prevProps, prevState) {
        const {
            minimized,
            disabled,
            mediaSource,
            url,
            centerFocus,
            flipHorizontally,
            flipVertically,
            scale
        } = this.state;

        store.set('widgets.webcam.minimized', minimized);
        store.set('widgets.webcam.disabled', disabled);
        store.set('widgets.webcam.mediaSource', mediaSource);
        store.set('widgets.webcam.url', url);
        store.set('widgets.webcam.centerFocus', centerFocus);
        store.set('widgets.webcam.geometry.flipHorizontally', flipHorizontally);
        store.set('widgets.webcam.geometry.flipVertically', flipVertically);
        store.set('widgets.webcam.geometry.scale', scale);
    }
    getInitialState() {
        return {
            minimized: store.get('widgets.webcam.minimized', false),
            isFullscreen: false,
            disabled: store.get('widgets.webcam.disabled', true),
            mediaSource: store.get('widgets.webcam.mediaSource', MEDIA_SOURCE_LOCAL),
            url: store.get('widgets.webcam.url'),
            centerFocus: store.get('widgets.webcam.centerFocus', false),
            flipHorizontally: store.get('widgets.webcam.geometry.flipHorizontally', false),
            flipVertically: store.get('widgets.webcam.geometry.flipVertically', false),
            scale: store.get('widgets.webcam.geometry.scale', 1.0)
        };
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
            ...this.actions
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
                            onClick={(event) => this.webcam.refresh()}
                        >
                            <i className="fa fa-refresh" />
                        </Widget.Button>
                        <Widget.Button
                            title={minimized ? i18n._('Open') : i18n._('Close')}
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
                            title={i18n._('Remove')}
                            onClick={(event) => this.props.onDelete()}
                        >
                            <i className="fa fa-times" />
                        </Widget.Button>
                    </Widget.Controls>
                    <Widget.Toolbar>
                        <Widget.Button
                            title={disabled ? i18n._('Enable') : i18n._('Disable')}
                            type="default"
                            onClick={(event) => this.setState({ disabled: !disabled })}
                        >
                            <i className={classes.webcamOnOff} />
                        </Widget.Button>
                    </Widget.Toolbar>
                </Widget.Header>
                <Widget.Content
                    className={classNames(
                        styles['widget-content'],
                        { [styles.hidden]: minimized },
                        { [styles.fullscreen]: isFullscreen }
                    )}
                >
                    <Webcam
                        ref={node => {
                            this.webcam = node;
                        }}
                        state={state}
                        actions={actions}
                    />
                </Widget.Content>
            </Widget>
        );
    }
}

export default WebcamWidget;
