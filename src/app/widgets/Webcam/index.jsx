import PropTypes from 'prop-types';
import React, { Component } from 'react';
import FontAwesomeIcon from 'app/components/FontAwesomeIcon';
import Space from 'app/components/Space';
import Widget from 'app/components/Widget';
import i18n from 'app/lib/i18n';
import portal from 'app/lib/portal';
import WidgetConfig from 'app/widgets/shared/WidgetConfig';
import WidgetConfigProvider from 'app/widgets/shared/WidgetConfigProvider';
import WidgetEventEmitter from 'app/widgets/shared/WidgetEventEmitter';
import Webcam from './Webcam';
import Settings from './Settings';
import {
    MEDIA_SOURCE_LOCAL,
} from './constants';

class WebcamWidget extends Component {
    static propTypes = {
        widgetId: PropTypes.string.isRequired,
        onFork: PropTypes.func.isRequired,
        onRemove: PropTypes.func.isRequired,
        sortable: PropTypes.object
    };

    // Public methods
    collapse = () => {
        this.setState({ minimized: true });
    };

    expand = () => {
        this.setState({ minimized: false });
    };

    config = new WidgetConfig(this.props.widgetId);

    state = this.getInitialState();

    toggleFullscreen = () => {
        this.setState(state => ({
            minimized: state.isFullscreen ? state.minimized : false,
            isFullscreen: !state.isFullscreen,
        }));
    };

    toggleMinimized = () => {
        this.setState(state => ({
            minimized: !state.minimized,
        }));
    };

    componentDidUpdate(prevProps, prevState) {
        const {
            disabled,
            minimized,
            mediaSource,
            deviceId,
            url,
        } = this.state;

        this.config.set('disabled', disabled);
        this.config.set('minimized', minimized);
        this.config.set('mediaSource', mediaSource);
        this.config.set('deviceId', deviceId);
        this.config.set('url', url);
    }

    getInitialState() {
        return {
            disabled: this.config.get('disabled', true),
            minimized: this.config.get('minimized', false),
            isFullscreen: false,
            mediaSource: this.config.get('mediaSource', MEDIA_SOURCE_LOCAL),
            deviceId: this.config.get('deviceId', ''),
            url: this.config.get('url', ''),
        };
    }

    render() {
        const { widgetId } = this.props;
        const {
            disabled,
            minimized,
            isFullscreen,
            mediaSource,
            deviceId,
            url,
        } = this.state;
        const isForkedWidget = widgetId.match(/\w+:[\w\-]+/);

        return (
            <WidgetConfigProvider config={this.config}>
                <WidgetEventEmitter>
                    {(emitter) => (
                        <Widget fullscreen={isFullscreen}>
                            <Widget.Header>
                                <Widget.Title>
                                    <Widget.Sortable className={this.props.sortable.handleClassName}>
                                        <FontAwesomeIcon icon="bars" fixedWidth />
                                        <Space width={4} />
                                    </Widget.Sortable>
                                    {isForkedWidget &&
                                    <FontAwesomeIcon icon="code-branch" fixedWidth />
                                    }
                                    {i18n._('Webcam')}
                                </Widget.Title>
                                <Widget.Controls className={this.props.sortable.filterClassName}>
                                    <Widget.Button
                                        title={disabled ? i18n._('Enable') : i18n._('Disable')}
                                        type="default"
                                        onClick={(event) => this.setState(state => ({ disabled: !state.disabled }))}
                                    >
                                        {disabled &&
                                        <FontAwesomeIcon icon="toggle-off" fixedWidth />
                                        }
                                        {!disabled &&
                                        <FontAwesomeIcon icon="toggle-on" fixedWidth />
                                        }
                                    </Widget.Button>
                                    <Widget.Button
                                        disabled={disabled}
                                        title={i18n._('Refresh')}
                                        onClick={(event) => this.webcam.refresh()}
                                    >
                                        <FontAwesomeIcon icon="redo-alt" fixedWidth />
                                    </Widget.Button>
                                    <Widget.Button
                                        disabled={isFullscreen}
                                        title={minimized ? i18n._('Expand') : i18n._('Collapse')}
                                        onClick={this.toggleMinimized}
                                    >
                                        {minimized &&
                                        <FontAwesomeIcon icon="chevron-down" fixedWidth />
                                        }
                                        {!minimized &&
                                        <FontAwesomeIcon icon="chevron-up" fixedWidth />
                                        }
                                    </Widget.Button>
                                    {isFullscreen && (
                                        <Widget.Button
                                            title={i18n._('Exit Full Screen')}
                                            onClick={this.toggleFullscreen}
                                        >
                                            <FontAwesomeIcon icon="compress" fixedWidth />
                                        </Widget.Button>
                                    )}
                                    <Widget.DropdownButton
                                        title={i18n._('More')}
                                        toggle={(
                                            <FontAwesomeIcon icon="ellipsis-v" fixedWidth />
                                        )}
                                        onSelect={(eventKey) => {
                                            if (eventKey === 'settings') {
                                                const { mediaSource, deviceId, url } = this.state;

                                                portal(({ onClose }) => (
                                                    <Settings
                                                        mediaSource={mediaSource}
                                                        deviceId={deviceId}
                                                        url={url}
                                                        onSave={(data) => {
                                                            const { mediaSource, deviceId, url } = data;
                                                            this.setState({ mediaSource, deviceId, url });
                                                            onClose();
                                                        }}
                                                        onCancel={() => {
                                                            onClose();
                                                        }}
                                                    />
                                                ));
                                            } else if (eventKey === 'fullscreen') {
                                                this.toggleFullscreen();
                                            } else if (eventKey === 'fork') {
                                                this.props.onFork();
                                            } else if (eventKey === 'remove') {
                                                this.props.onRemove();
                                            }
                                        }}
                                    >
                                        <Widget.DropdownMenuItem eventKey="settings">
                                            <FontAwesomeIcon icon="cog" fixedWidth />
                                            <Space width={8} />
                                            {i18n._('Settings')}
                                        </Widget.DropdownMenuItem>
                                        <Widget.DropdownMenuItem eventKey="fullscreen">
                                            {!isFullscreen && (
                                                <FontAwesomeIcon icon="expand" fixedWidth />
                                            )}
                                            {isFullscreen && (
                                                <FontAwesomeIcon icon="compress" fixedWidth />
                                            )}
                                            <Space width={8} />
                                            {!isFullscreen ? i18n._('Enter Full Screen') : i18n._('Exit Full Screen')}
                                        </Widget.DropdownMenuItem>
                                        <Widget.DropdownMenuItem eventKey="fork">
                                            <FontAwesomeIcon icon="code-branch" fixedWidth />
                                            <Space width={8} />
                                            {i18n._('Fork Widget')}
                                        </Widget.DropdownMenuItem>
                                        <Widget.DropdownMenuItem eventKey="remove">
                                            <FontAwesomeIcon icon="times" fixedWidth />
                                            <Space width={8} />
                                            {i18n._('Remove Widget')}
                                        </Widget.DropdownMenuItem>
                                    </Widget.DropdownButton>
                                </Widget.Controls>
                            </Widget.Header>
                            <Widget.Content
                                style={{
                                    display: (minimized ? 'none' : 'block'),
                                }}
                            >
                                <Webcam
                                    disabled={disabled}
                                    mediaSource={mediaSource}
                                    deviceId={deviceId}
                                    url={url}
                                    style={{
                                        minHeight: isFullscreen ? '100%' : 240,
                                    }}
                                />
                            </Widget.Content>
                        </Widget>
                    )}
                </WidgetEventEmitter>
            </WidgetConfigProvider>
        );
    }
}

export default WebcamWidget;
