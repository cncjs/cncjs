import cx from 'classnames';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Space from 'app/components/Space';
import Widget from 'app/components/Widget';
import i18n from 'app/lib/i18n';
import portal from 'app/lib/portal';
import WidgetConfig from '../WidgetConfig';
import Webcam from './Webcam';
import Settings from './Settings';
import styles from './index.styl';
import {
  MEDIA_SOURCE_LOCAL,
  MEDIA_SOURCE_STREAM,
} from './constants';

const normalizeMediaSource = (mediaSource) => {
  if ((mediaSource === MEDIA_SOURCE_LOCAL) || (mediaSource === MEDIA_SOURCE_STREAM)) {
    return mediaSource;
  }
  return MEDIA_SOURCE_LOCAL;
};

class WebcamWidget extends PureComponent {
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

    actions = {
      toggleFullscreen: () => {
        const { minimized, isFullscreen } = this.state;
        this.setState({
          minimized: isFullscreen ? minimized : false,
          isFullscreen: !isFullscreen
        });
      },
      toggleMinimized: () => {
        const { minimized } = this.state;
        this.setState({ minimized: !minimized });
      },
      changeImageScale: (value) => {
        this.setState({ scale: value });
      },
      rotateLeft: () => {
        const { flipHorizontally, flipVertically, rotation } = this.state;
        const rotateLeft = (flipHorizontally && flipVertically) || (!flipHorizontally && !flipVertically);
        const modulus = 4;
        const i = rotateLeft ? -1 : 1;
        this.setState({ rotation: (Math.abs(Number(rotation || 0)) + modulus + i) % modulus });
      },
      rotateRight: () => {
        const { flipHorizontally, flipVertically, rotation } = this.state;
        const rotateRight = (flipHorizontally && flipVertically) || (!flipHorizontally && !flipVertically);
        const modulus = 4;
        const i = rotateRight ? 1 : -1;
        this.setState({ rotation: (Math.abs(Number(rotation || 0)) + modulus + i) % modulus });
      },
      toggleFlipHorizontally: () => {
        const { flipHorizontally } = this.state;
        this.setState({ flipHorizontally: !flipHorizontally });
      },
      toggleFlipVertically: () => {
        const { flipVertically } = this.state;
        this.setState({ flipVertically: !flipVertically });
      },
      toggleCrosshair: () => {
        const { crosshair } = this.state;
        this.setState({ crosshair: !crosshair });
      },
      toggleMute: () => {
        const { muted } = this.state;
        this.setState({ muted: !muted });
      }
    };

    webcam = null;

    componentDidUpdate(prevProps, prevState) {
      const {
        disabled,
        minimized,
        mediaSource,
        deviceId,
        url,
        scale,
        rotation,
        flipHorizontally,
        flipVertically,
        crosshair,
        muted
      } = this.state;

      this.config.set('disabled', disabled);
      this.config.set('minimized', minimized);
      this.config.set('mediaSource', mediaSource);
      this.config.set('deviceId', deviceId);
      this.config.set('url', url);
      this.config.set('geometry.scale', scale);
      this.config.set('geometry.rotation', rotation);
      this.config.set('geometry.flipHorizontally', flipHorizontally);
      this.config.set('geometry.flipVertically', flipVertically);
      this.config.set('crosshair', crosshair);
      this.config.set('muted', muted);
    }

    getInitialState() {
      return {
        disabled: this.config.get('disabled', true),
        minimized: this.config.get('minimized', false),
        isFullscreen: false,
        mediaSource: normalizeMediaSource(this.config.get('mediaSource')),
        deviceId: this.config.get('deviceId', ''),
        url: this.config.get('url', ''),
        scale: this.config.get('geometry.scale', 1.0),
        rotation: this.config.get('geometry.rotation', 0),
        flipHorizontally: this.config.get('geometry.flipHorizontally', false),
        flipVertically: this.config.get('geometry.flipVertically', false),
        crosshair: this.config.get('crosshair', false),
        muted: this.config.get('muted', false)
      };
    }

    render() {
      const { widgetId } = this.props;
      const { disabled, minimized, isFullscreen } = this.state;
      const isForkedWidget = widgetId.match(/\w+:[\w\-]+/);
      const state = {
        ...this.state
      };
      const actions = {
        ...this.actions
      };

      return (
        <Widget aria-label="Webcam widget" fullscreen={isFullscreen}>
          <Widget.Header>
            <Widget.Title>
              <Widget.Sortable className={this.props.sortable.handleClassName}>
                <i aria-hidden="true" className="fa fa-bars" />
                <Space width="8" />
              </Widget.Sortable>
              {isForkedWidget &&
                <i aria-hidden="true" className="fa fa-code-fork" style={{ marginRight: 5 }} />}
              {i18n._('Webcam')}
            </Widget.Title>
            <Widget.Controls className={this.props.sortable.filterClassName}>
              <Widget.Button
                aria-label={disabled ? 'Enable Webcam' : 'Disable Webcam'}
                title={disabled ? i18n._('Enable') : i18n._('Disable')}
                type="default"
                onClick={(event) => this.setState({ disabled: !disabled })}
              >
                <i
                  aria-hidden="true"
                  className={cx('fa', 'fa-fw', {
                    'fa-toggle-on': !disabled,
                    'fa-toggle-off': disabled
                  })}
                />
              </Widget.Button>
              <Widget.Button
                aria-label="Refresh webcam"
                disabled={disabled}
                title={i18n._('Refresh')}
                onClick={(event) => this.webcam.refresh()}
              >
                <i aria-hidden="true" className="fa fa-refresh" />
              </Widget.Button>
              <Widget.Button
                aria-label="Webcam settings"
                title={i18n._('Edit')}
                onClick={(event) => {
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
                }}
              >
                <i aria-hidden="true" className="fa fa-cog" />
              </Widget.Button>
              <Widget.Button
                aria-label={minimized ? 'Expand' : 'Collapse'}
                aria-expanded={!minimized}
                disabled={isFullscreen}
                title={minimized ? i18n._('Expand') : i18n._('Collapse')}
                onClick={actions.toggleMinimized}
              >
                <i
                  aria-hidden="true"
                  className={cx('fa', 'fa-fw', {
                    'fa-chevron-up': !minimized,
                    'fa-chevron-down': minimized
                  })}
                />
              </Widget.Button>
              <Widget.DropdownButton
                aria-label="More options"
                title={i18n._('More')}
                toggle={<i aria-hidden="true" className="fa fa-ellipsis-v" />}
                onSelect={(eventKey) => {
                  if (eventKey === 'fullscreen') {
                    actions.toggleFullscreen();
                  } else if (eventKey === 'fork') {
                    this.props.onFork();
                  } else if (eventKey === 'remove') {
                    this.props.onRemove();
                  }
                }}
              >
                <Widget.DropdownMenuItem eventKey="fullscreen">
                  <i
                    aria-hidden="true"
                    className={cx('fa', 'fa-fw', {
                      'fa-expand': !isFullscreen,
                      'fa-compress': isFullscreen
                    })}
                  />
                  <Space width="4" />
                  {!isFullscreen ? i18n._('Enter Full Screen') : i18n._('Exit Full Screen')}
                </Widget.DropdownMenuItem>
                <Widget.DropdownMenuItem eventKey="fork">
                  <i aria-hidden="true" className="fa fa-fw fa-code-fork" />
                  <Space width="4" />
                  {i18n._('Fork Widget')}
                </Widget.DropdownMenuItem>
                <Widget.DropdownMenuItem eventKey="remove">
                  <i aria-hidden="true" className="fa fa-fw fa-times" />
                  <Space width="4" />
                  {i18n._('Remove Widget')}
                </Widget.DropdownMenuItem>
              </Widget.DropdownButton>
            </Widget.Controls>
          </Widget.Header>
          <Widget.Content
            aria-hidden={minimized}
            className={cx(styles.widgetContent, {
              [styles.hidden]: minimized,
              [styles.fullscreen]: isFullscreen
            })}
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
