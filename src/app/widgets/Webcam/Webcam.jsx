import {
  Box,
  Text,
} from '@tonic-ui/react';
import cx from 'classnames';
import _isEqual from 'lodash/isEqual';
import Slider from 'rc-slider';
import React, { useEffect, useRef } from 'react';
import compose from 'recompose/compose';
import styled from 'styled-components';
import Anchor from 'app/components/Anchor';
import { Container, Row, Col } from 'app/components/GridSystem';
import Image from 'app/components/Image';
import Tooltip from 'app/components/Tooltip';
import WebcamComponent from 'app/components/Webcam';
import withMemo from 'app/hocs/withMemo';
import i18n from 'app/lib/i18n';
import useWidgetConfig from 'app/widgets/shared/useWidgetConfig';
import useWidgetEvent from 'app/widgets/shared/useWidgetEvent';
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

  return String(url).trim().replace(/((?:https?:)?\/\/)?(0.0.0.0)/i, (match, p1, p2, offset, string) => {
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
  const streamRef = useRef();

  useEffect(() => {
    const onRefreshStream = () => {
      const el = streamRef.current;
      el.src = '';

      setTimeout(() => {
        el.src = mapMetaAddressToHostname(url);
      }, 10); // delay 10ms
    };

    widgetEmitter.on('refresh', onRefreshStream);

    return () => {
      widgetEmitter.off('refresh', onRefreshStream);
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
  const isVideoStream = url.endsWith('.mp4');

  return (
    <>
      {disabled && (
        <WebcamDisabledContainer>
          <Image src={webcamIcon} width={128} height={128} />
          <Box top="4x">
            <Text size="2xl">
              {i18n._('Webcam is off')}
            </Text>
          </Box>
        </WebcamDisabledContainer>
      )}
      <WebcamContainer
        style={{
          display: disabled ? 'none' : 'block',
          minHeight: isFullscreen ? '100%' : 240,
        }}
      >
        {mediaSource === MEDIA_SOURCE_LOCAL && (
          <div style={{ width: '100%' }}>
            <WebcamComponent
              className={styles.center}
              style={{
                transform: transformStyle,
              }}
              width={(100 * scale).toFixed(0) + '%'}
              height="auto"
              muted={muted}
              video={!!deviceId ? deviceId : true}
            />
          </div>
        )}
        {(mediaSource === MEDIA_SOURCE_STREAM && isVideoStream) && (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video
            ref={streamRef}
            src={mapMetaAddressToHostname(url)}
            style={{
              width: (100 * scale).toFixed(0) + '%',
              transform: transformStyle,
            }}
            className={styles.center}
            height="auto"
            muted={muted}
            src={mapMetaAddressToHostname(url)}
            autoPlay={true}
          />
        )}
        {(mediaSource === MEDIA_SOURCE_STREAM && !isVideoStream) && (
          <Image
            ref={streamRef}
            src={mapMetaAddressToHostname(url)}
            style={{
              width: (100 * scale).toFixed(0) + '%',
              transform: transformStyle,
            }}
            className={styles.center}
          />
        )}
        {crosshair && (
          <div>
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
          </div>
        )}
        <ControlBar>
          <Box
            mx="3x"
            mb="1x"
          >
            <Slider
              defaultValue={scale}
              min={0.1}
              max={10}
              step={0.1}
              tipFormatter={null}
              onChange={changeImageScale}
            />
          </Box>
          <Container
            fluid
            style={{
              backgroundColor: '#000',
              padding: '.125rem .75rem',
            }}
          >
            <Row>
              <Col width="auto">
                <ScaleText>{scale}x</ScaleText>
              </Col>
              <Col>
                {mediaSource === MEDIA_SOURCE_LOCAL && (
                  <Anchor
                    className={styles.btnIcon}
                    onClick={toggleMuted}
                  >
                    <i
                      className={cx(
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
                  enterDelay={500}
                  hideOnClick
                  placement="top"
                >
                  <Anchor
                    className={styles.btnIcon}
                    onClick={rotateLeft}
                  >
                    <i
                      className={cx(
                        styles.icon,
                        styles.inverted,
                        styles.iconRotateLeft
                      )}
                    />
                  </Anchor>
                </Tooltip>
                <Tooltip
                  content={i18n._('Rotate Right')}
                  enterDelay={500}
                  hideOnClick
                  placement="top"
                >
                  <Anchor
                    className={styles.btnIcon}
                    onClick={rotateRight}
                  >
                    <i
                      className={cx(
                        styles.icon,
                        styles.inverted,
                        styles.iconRotateRight
                      )}
                    />
                  </Anchor>
                </Tooltip>
                <Tooltip
                  content={i18n._('Flip Horizontally')}
                  enterDelay={500}
                  hideOnClick
                  placement="top"
                >
                  <Anchor
                    className={styles.btnIcon}
                    onClick={toggleFlipHorizontally}
                  >
                    <i
                      className={cx(
                        styles.icon,
                        styles.inverted,
                        styles.iconFlipHorizontally
                      )}
                    />
                  </Anchor>
                </Tooltip>
                <Tooltip
                  content={i18n._('Flip Vertically')}
                  enterDelay={500}
                  hideOnClick
                  placement="top"
                >
                  <Anchor
                    className={styles.btnIcon}
                    onClick={toggleFlipVertically}
                  >
                    <i
                      className={cx(
                        styles.icon,
                        styles.inverted,
                        styles.iconFlipVertically
                      )}
                    />
                  </Anchor>
                </Tooltip>
                <Tooltip
                  content={i18n._('Crosshair')}
                  enterDelay={500}
                  hideOnClick
                  placement="top"
                >
                  <Anchor
                    className={styles.btnIcon}
                    onClick={toggleCrosshair}
                  >
                    <i
                      className={cx(
                        styles.icon,
                        styles.inverted,
                        styles.iconCrosshair
                      )}
                    />
                  </Anchor>
                </Tooltip>
              </Col>
            </Row>
          </Container>
        </ControlBar>
      </WebcamContainer>
    </>
  );
}

export default compose(
  withMemo(_isEqual),
)(Webcam);

const ControlBar = styled.div`
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;

    opacity: 0;
    transition: all 200ms ease-in; // use "ease-in" when things are moving out
`;

const ScaleText = styled.div`
    float: left;
    color: #f5f5f5;
    font-size: 14px;
    text-shadow: 0 0 5px #333;
`;

const WebcamDisabledContainer = styled.div`
    padding: 1rem;
    text-align: center;
`;

const WebcamContainer = styled.div`
    background-color: #000;
    min-height: 240px;
    text-align: center;
    overflow: hidden;
    position: relative;

    &:hover {
        ${ControlBar} {
            opacity: 1;
            transition: all 250ms ease-out; // use "ease-out" when things are moving in
        }
    }
`;
