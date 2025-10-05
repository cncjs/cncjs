/* eslint jsx-a11y/media-has-caption: 0 */
import classNames from 'classnames';
import Slider from 'rc-slider';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import ReactDOM from 'react-dom';
import Anchor from 'app/components/Anchor';
import { Tooltip } from 'app/components/Tooltip';
import WebcamComponent from 'app/components/Webcam';
import i18n from 'app/lib/i18n';
import Image from './Image';
import Line from './Line';
import Circle from './Circle';
import styles from './index.styl';
import {
  MEDIA_SOURCE_LOCAL,
  MEDIA_SOURCE_STREAM
} from './constants';

// | Before                | After                   |
// |-----------------------|-------------------------|
// | http://0.0.0.0:8000/  | http://localhost:8000/  |
// | https://0.0.0.0:8000/ | https://localhost:8000/ |
// | //0.0.0.0:8000/       | //localhost:8000/       |
// |-----------------------|-------------------------|
const mapMetaAddressToHostname = (url) => {
  const hostname = window.location.hostname;

  return String(url).trim().replace(/((?:https?:)?\/\/)?(0.0.0.0)/i, (match, p1, p2, offset, string) => {
    // p1 = 'http://'
    // p2 = '0.0.0.0'
    return [p1, hostname].join('');
  });
};

class Webcam extends PureComponent {
  static propTypes = {
    state: PropTypes.object,
    actions: PropTypes.object
  };

  imageSource = null;

  refresh() {
    const { state } = this.props;

    if (this.imageSource) {
      const el = ReactDOM.findDOMNode(this.imageSource);
      el.src = '';

      setTimeout(() => {
        el.src = mapMetaAddressToHostname(state.url);
      }, 10); // delay 10ms
    }
  }

  render() {
    const { state, actions } = this.props;
    const {
      disabled,
      mediaSource,
      deviceId,
      url,
      scale,
      rotation,
      flipHorizontally,
      flipVertically,
      crosshair,
      muted
    } = state;

    // Find a better solution to determine whether to use the <video/> or <img/> tag.
    // Currently using the URL extension check for ".mp4" as a proxy.
    const isVideoStream = url.endsWith('.mp4');

    if (disabled) {
      return (
        <div className={styles['webcam-off-container']}>
          <h4><i className={styles['icon-webcam']} /></h4>
          <h5>{i18n._('Webcam is off')}</h5>
        </div>
      );
    }

    const transformStyle = [
      'translate(-50%, -50%)',
      `rotateX(${flipVertically ? 180 : 0}deg)`,
      `rotateY(${flipHorizontally ? 180 : 0}deg)`,
      `rotate(${(rotation % 4) * 90}deg)`
    ].join(' ');

    return (
      <div className={styles['webcam-on-container']}>
        {mediaSource === MEDIA_SOURCE_LOCAL && (
          <div style={{ width: '100%' }}>
            <WebcamComponent
              className={styles.center}
              style={{ transform: transformStyle }}
              width={(100 * scale).toFixed(0) + '%'}
              height="auto"
              muted={muted}
              video={!!deviceId ? deviceId : true}
            />
          </div>
        )}
        {mediaSource === MEDIA_SOURCE_STREAM && (
          isVideoStream
            ? (
              <video
                className={styles.center}
                style={{ transform: transformStyle }}
                width={(100 * scale).toFixed(0) + '%'}
                height="auto"
                muted={muted}
                src={mapMetaAddressToHostname(url)}
                autoPlay={true}
              />
            ) : (
              <Image
                ref={node => {
                  this.imageSource = node;
                }}
                src={mapMetaAddressToHostname(url)}
                style={{
                  width: (100 * scale).toFixed(0) + '%',
                  transform: transformStyle
                }}
                className={styles.center}
              />
            )
        )}
        {crosshair && (
          <div>
            <Line
              className={classNames(
                styles.center,
                styles['line-shadow']
              )}
              length="100%"
            />
            <Line
              className={classNames(
                styles.center,
                styles['line-shadow']
              )}
              length="100%"
              vertical
            />
            <Circle
              className={classNames(
                styles.center,
                styles['line-shadow']
              )}
              diameter={20}
            />
            <Circle
              className={classNames(
                styles.center,
                styles['line-shadow']
              )}
              diameter={40}
            />
          </div>
        )}
        <div className={styles.toolbar}>
          <div className={styles.scaleText}>{scale}x</div>
          <div className="pull-right">
            {mediaSource === MEDIA_SOURCE_LOCAL && (
              <Anchor
                className={styles.btnIcon}
                onClick={actions.toggleMute}
              >
                <i
                  className={classNames(
                    styles.icon,
                    styles.inverted,
                    { [styles.iconUnmute]: !muted },
                    { [styles.iconMute]: muted }
                  )}
                />
              </Anchor>
            )}
            <Tooltip
              content={i18n._('Rotate Left')}
              placement="top"
            >
              <Anchor
                className={styles.btnIcon}
                onClick={actions.rotateLeft}
              >
                <i
                  className={classNames(
                    styles.icon,
                    styles.inverted,
                    styles.iconRotateLeft
                  )}
                />
              </Anchor>
            </Tooltip>
            <Tooltip
              content={i18n._('Rotate Right')}
              placement="top"
            >
              <Anchor
                className={styles.btnIcon}
                onClick={actions.rotateRight}
              >
                <i
                  className={classNames(
                    styles.icon,
                    styles.inverted,
                    styles.iconRotateRight
                  )}
                />
              </Anchor>
            </Tooltip>
            <Tooltip
              content={i18n._('Flip Horizontally')}
              placement="top"
            >
              <Anchor
                className={styles.btnIcon}
                onClick={actions.toggleFlipHorizontally}
              >
                <i
                  className={classNames(
                    styles.icon,
                    styles.inverted,
                    styles.iconFlipHorizontally
                  )}
                />
              </Anchor>
            </Tooltip>
            <Tooltip
              content={i18n._('Flip Vertically')}
              placement="top"
            >
              <Anchor
                className={styles.btnIcon}
                onClick={actions.toggleFlipVertically}
              >
                <i
                  className={classNames(
                    styles.icon,
                    styles.inverted,
                    styles.iconFlipVertically
                  )}
                />
              </Anchor>
            </Tooltip>
            <Tooltip
              content={i18n._('Crosshair')}
              placement="top"
            >
              <Anchor
                className={styles.btnIcon}
                onClick={actions.toggleCrosshair}
              >
                <i
                  className={classNames(
                    styles.icon,
                    styles.inverted,
                    styles.iconCrosshair
                  )}
                />
              </Anchor>
            </Tooltip>
          </div>
        </div>
        <div className={styles['image-scale-slider']}>
          <Slider
            defaultValue={scale}
            min={0.1}
            max={10}
            step={0.1}
            tipFormatter={null}
            onChange={actions.changeImageScale}
          />
        </div>
      </div>
    );
  }
}

export default Webcam;
