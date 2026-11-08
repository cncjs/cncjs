import {
  Box,
  Text,
  Tooltip,
} from '@tonic-ui/react';
import { ensureString } from 'ensure-type';
import cx from 'classnames';
import Slider from 'rc-slider';
import React, { useEffect, useRef } from 'react';
import WebcamComponent from '@app/components/Webcam';
import i18n from '@app/lib/i18n';
import useWidgetConfig from '@app/widgets/shared/useWidgetConfig';
import useWidgetEvent from '@app/widgets/shared/useWidgetEvent';
import Line from './components/Line';
import Circle from './components/Circle';
import webcamIcon from './images/webcam.svg';
import {
  MEDIA_SOURCE_LOCAL,
  MEDIA_SOURCE_STREAM,
} from './constants';
import styles from './index.styl';

// | Before                | After                   |
// |-----------------------|-------------------------|
// | http://0.0.0.0:8000/  | http://localhost:8000/  |
// | https://0.0.0.0:8000/ | https://localhost:8000/ |
// | //0.0.0.0:8000/       | //localhost:8000/       |
// |-----------------------|-------------------------|
const mapMetaAddressToHostname = (url) => {
  const hostname = window.location.hostname;

  return ensureString(url).trim().replace(/((?:https?:)?\/\/)?(0.0.0.0)/i, (match, p1) => {
    // p1 = 'http://'
    // p2 = '0.0.0.0'
    return [p1, hostname].join('');
  });
};

const normalizeMediaSource = (mediaSource) => {
  if ((mediaSource === MEDIA_SOURCE_LOCAL) || (mediaSource === MEDIA_SOURCE_STREAM)) {
    return mediaSource;
  }
  return MEDIA_SOURCE_LOCAL;
};

/**
 * @param {{ label: string, onClick: () => void, iconClass: string }} props
 */
function ControlButton({ label, onClick, iconClass }) {
  return (
    <Tooltip label={label} shouldWrapChildren>
      <Box
        as="button"
        aria-label={label}
        type="button"
        className={styles.btnIcon}
        sx={{ background: 'transparent', border: 0, padding: 0 }}
        onClick={onClick}
      >
        <i className={iconClass} />
      </Box>
    </Tooltip>
  );
}

/**
 * @param {{ disabled: boolean, isFullscreen: boolean }} props
 */
function Webcam({
  disabled,
  isFullscreen,
}) {
  const widgetConfig = useWidgetConfig();
  const widgetEmitter = useWidgetEvent();
  const mediaSource = normalizeMediaSource(widgetConfig.get('mediaSource'));
  const deviceId = widgetConfig.get('deviceId');
  const url = widgetConfig.get('url');
  const scale = widgetConfig.get('geometry.scale', 1.0);
  const rotation = widgetConfig.get('geometry.rotation', 0);
  const flipHorizontally = widgetConfig.get('geometry.flipHorizontally', false);
  const flipVertically = widgetConfig.get('geometry.flipVertically', false);
  const crosshair = widgetConfig.get('crosshair', false);
  const muted = widgetConfig.get('muted', false);
  const streamRef = useRef(null);
  const refreshTimeoutRef = useRef(null);

  useEffect(() => {
    const onRefreshStream = () => {
      const el = streamRef.current;
      if (!el) {
        return;
      }
      el.src = '';

      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = setTimeout(() => {
        if (streamRef.current === el) {
          el.src = mapMetaAddressToHostname(url);
        }
      }, 10); // delay 10ms
    };

    widgetEmitter.on('refresh', onRefreshStream);

    return () => {
      widgetEmitter.off('refresh', onRefreshStream);
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    };
  }, [widgetEmitter, url]);

  const changeImageScale = (value) => {
    widgetConfig.set('geometry.scale', value);
  };

  const rotateLeft = () => {
    const rotateLeft = (flipHorizontally && flipVertically) || (!flipHorizontally && !flipVertically);
    const modulus = 4;
    const i = rotateLeft ? -1 : 1;

    widgetConfig.set('geometry.rotation', (Math.abs(Number(rotation || 0)) + modulus + i) % modulus);
  };

  const rotateRight = () => {
    const rotateRight = (flipHorizontally && flipVertically) || (!flipHorizontally && !flipVertically);
    const modulus = 4;
    const i = rotateRight ? 1 : -1;

    widgetConfig.set('geometry.rotation', (Math.abs(Number(rotation || 0)) + modulus + i) % modulus);
  };

  const toggleFlipHorizontally = () => {
    widgetConfig.set('geometry.flipHorizontally', !flipHorizontally);
  };

  const toggleFlipVertically = () => {
    widgetConfig.set('geometry.flipVertically', !flipVertically);
  };

  const toggleCrosshair = () => {
    widgetConfig.set('crosshair', !crosshair);
  };

  const toggleMuted = () => {
    widgetConfig.set('muted', !muted);
  };

  const transformStyle = [
    'translate(-50%, -50%)',
    `rotateX(${flipVertically ? 180 : 0}deg)`,
    `rotateY(${flipHorizontally ? 180 : 0}deg)`,
    `rotate(${(rotation % 4) * 90}deg)`
  ].join(' ');

  // Find a better solution to determine whether to use the <video/> or <img/> tag.
  // Currently using the URL extension check for ".mp4" as a proxy.
  const isVideoStream = ensureString(url).endsWith('.mp4');

  return (
    <>
      {disabled && (
        <Box sx={{ padding: '1rem', textAlign: 'center' }}>
          <Box
            as="img" src={webcamIcon} width={128}
            height={128}
          />
          <Box top="4x">
            <Text size="2xl">
              {i18n._('Webcam is off')}
            </Text>
          </Box>
        </Box>
      )}
      <Box
        sx={{
          display: disabled ? 'none' : 'block',
          minHeight: isFullscreen ? '100%' : 240,
          backgroundColor: 'background._fixed.dark.low',
          overflow: 'hidden',
          position: 'relative',
          textAlign: 'center',
          '&:hover .webcam-control-bar': {
            opacity: 1,
            transition: 'all 250ms ease-out',
          },
        }}
      >
        {mediaSource === MEDIA_SOURCE_LOCAL && (
          <Box sx={{ width: '100%' }}>
            <WebcamComponent
              className={styles.center}
              sx={{
                transform: transformStyle,
              }}
              width={(100 * scale).toFixed(0) + '%'}
              height="auto"
              muted={muted}
              video={!!deviceId ? deviceId : true}
            />
          </Box>
        )}
        {(mediaSource === MEDIA_SOURCE_STREAM && isVideoStream) && (
          <Box
            as="video"
            ref={streamRef}
            src={mapMetaAddressToHostname(url)}
            sx={{
              width: (100 * scale).toFixed(0) + '%',
              transform: transformStyle,
            }}
            className={styles.center}
            height="auto"
            muted={muted}
            autoPlay={true}
          />
        )}
        {(mediaSource === MEDIA_SOURCE_STREAM && !isVideoStream) && (
          <Box
            as="img"
            ref={streamRef}
            src={mapMetaAddressToHostname(url)}
            sx={{
              width: (100 * scale).toFixed(0) + '%',
              transform: transformStyle,
            }}
            className={styles.center}
          />
        )}
        {crosshair && (
          <Box>
            <Line
              className={cx(
                styles.center
              )}
              length="100%"
            />
            <Line
              className={cx(
                styles.center,
              )}
              length="100%"
              vertical
            />
            <Circle
              className={cx(
                styles.center,
              )}
              diameter={20}
            />
            <Circle
              className={cx(
                styles.center,
              )}
              diameter={40}
            />
          </Box>
        )}
        <Box
          className="webcam-control-bar"
          sx={{
            bottom: 0,
            left: 0,
            opacity: 0,
            position: 'absolute',
            right: 0,
            transition: 'all 200ms ease-in',
          }}
        >
          <Box
            mx="3x"
            mb="1x"
          >
            <Slider
              ariaLabelForHandle={i18n._('Image scale')}
              defaultValue={scale}
              min={0.1}
              max={10}
              step={0.1}
              tipFormatter={null}
              onChange={changeImageScale}
            />
          </Box>
          <Box
            sx={{
              backgroundColor: 'background._fixed.dark.low',
              padding: '.125rem .75rem',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Text sx={{ color: 'text._fixed.dark.primary', fontSize: '14px', textShadow: '0 0 5px #333' }}>{scale}x</Text>
            <Box sx={{ flex: 1 }}>
              {mediaSource === MEDIA_SOURCE_LOCAL && (
                <ControlButton
                  label={i18n._(muted ? 'Unmute' : 'Mute')}
                  onClick={toggleMuted}
                  iconClass={cx(styles.icon, styles.inverted, { [styles.iconUnmute]: !muted }, { [styles.iconMute]: muted })}
                />
              )}
              <ControlButton label={i18n._('Rotate Left')} onClick={rotateLeft} iconClass={cx(styles.icon, styles.inverted, styles.iconRotateLeft)} />
              <ControlButton label={i18n._('Rotate Right')} onClick={rotateRight} iconClass={cx(styles.icon, styles.inverted, styles.iconRotateRight)} />
              <ControlButton label={i18n._('Flip Horizontally')} onClick={toggleFlipHorizontally} iconClass={cx(styles.icon, styles.inverted, styles.iconFlipHorizontally)} />
              <ControlButton label={i18n._('Flip Vertically')} onClick={toggleFlipVertically} iconClass={cx(styles.icon, styles.inverted, styles.iconFlipVertically)} />
              <ControlButton label={i18n._('Crosshair')} onClick={toggleCrosshair} iconClass={cx(styles.icon, styles.inverted, styles.iconCrosshair)} />
            </Box>
          </Box>
        </Box>
      </Box>
    </>
  );
}

export default Webcam;
