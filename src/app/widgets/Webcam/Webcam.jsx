import cx from 'classnames';
import _get from 'lodash/get';
import Slider from 'rc-slider';
import React, { useEffect, useRef } from 'react';
import Anchor from 'app/components/Anchor';
import Tooltip from 'app/components/Tooltip';
import WebcamComponent from 'app/components/Webcam';
import useStateWithEffect from 'app/hooks/useStateWithEffect';
import i18n from 'app/lib/i18n';
import useWidgetConfig from 'app/widgets/shared/useWidgetConfig';
import useWidgetEvent from 'app/widgets/shared/useWidgetEvent';
import Image from './Image';
import Line from './Line';
import Circle from './Circle';
import styles from './index.styl';
import {
    MEDIA_SOURCE_LOCAL,
    MEDIA_SOURCE_MJPEG,
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

const Webcam = ({
    disabled,
    mediaSource,
    deviceId,
    url,
    className,
    ...props
}) => {
    const config = useWidgetConfig();
    const emitter = useWidgetEvent();
    const [state, setState] = useStateWithEffect({
        geometry: {
            scale: config.get('geometry.scale', 1.0),
            rotation: config.get('geometry.rotation', 0),
            flipHorizontally: config.get('geometry.flipHorizontally', false),
            flipVertically: config.get('geometry.flipVertically', false),
        },
        crosshair: config.get('crosshair', false),
        muted: config.get('muted', false),
    }, (state) => {
        config.set('geometry.scale', _get(state, 'geometry.scale'));
        config.set('geometry.rotation', _get(state, 'geometry.rotation'));
        config.set('geometry.flipHorizontally', _get(state, 'geometry.flipHorizontally'));
        config.set('geometry.flipVertically', _get(state, 'geometry.flipVertically'));
        config.set('crosshair', _get(state, 'crosshair'));
        config.set('muted', _get(state, 'muted'));
    });
    const imageSourceRef = useRef();

    useEffect(() => {
        const onRefreshImageSource = () => {
            const el = imageSourceRef.current;
            el.src = '';

            setTimeout(() => {
                el.src = mapMetaAddressToHostname(url);
            }, 10); // delay 10ms
        };

        emitter.on('refresh', onRefreshImageSource);

        return () => {
            emitter.off('refresh', onRefreshImageSource);
        };
    });

    const changeImageScale = (value) => {
        setState(state => ({
            ...state,
            geometry: {
                ...state.geometry,
                scale: value,
            }
        }));
    };

    const rotateLeft = () => {
        const {
            geometry: {
                flipHorizontally,
                flipVertically,
                rotation,
            },
        } = state;
        const rotateLeft = (flipHorizontally && flipVertically) || (!flipHorizontally && !flipVertically);
        const modulus = 4;
        const i = rotateLeft ? -1 : 1;

        setState(state => ({
            ...state,
            geometry: {
                ...state.geometry,
                rotation: (Math.abs(Number(rotation || 0)) + modulus + i) % modulus,
            }
        }));
    };

    const rotateRight = () => {
        const {
            geometry: {
                flipHorizontally,
                flipVertically,
                rotation,
            },
        } = state;
        const rotateRight = (flipHorizontally && flipVertically) || (!flipHorizontally && !flipVertically);
        const modulus = 4;
        const i = rotateRight ? 1 : -1;

        setState(state => ({
            ...state,
            geometry: {
                ...state.geometry,
                rotation: (Math.abs(Number(rotation || 0)) + modulus + i) % modulus,
            }
        }));
    };

    const toggleFlipHorizontally = () => {
        setState(state => ({
            ...state,
            geometry: {
                ...state.geometry,
                flipHorizontally: !state.geometry.flipHorizontally,
            },
        }));
    };

    const toggleFlipVertically = () => {
        setState(state => ({
            ...state,
            geometry: {
                ...state.geometry,
                flipVertically: !state.geometry.flipVertically,
            },
        }));
    };

    const toggleCrosshair = () => {
        setState(state => ({
            ...state,
            crosshair: !state.crosshair,
        }));
    };

    const toggleMuted = () => {
        setState(state => ({
            ...state,
            muted: !state.muted,
        }));
    };

    if (disabled) {
        return (
            <div className={styles['webcam-off-container']}>
                <h4><i className={styles['icon-webcam']} /></h4>
                <h5>{i18n._('Webcam is off')}</h5>
            </div>
        );
    }

    const scale = _get(state, 'geometry.scale');
    const rotation = _get(state, 'geometry.rotation');
    const flipHorizontally = _get(state, 'geometry.flipHorizontally');
    const flipVertically = _get(state, 'geometry.flipVertically');
    const crosshair = _get(state, 'crosshair');
    const muted = _get(state, 'muted');
    const transformStyle = [
        'translate(-50%, -50%)',
        `rotateX(${flipVertically ? 180 : 0}deg)`,
        `rotateY(${flipHorizontally ? 180 : 0}deg)`,
        `rotate(${(rotation % 4) * 90}deg)`
    ].join(' ');

    return (
        <div
            {...props}
            className={cx(className, styles['webcam-on-container'])}
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
            {mediaSource === MEDIA_SOURCE_MJPEG && (
                <Image
                    ref={imageSourceRef}
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
                            styles.center,
                            styles['line-shadow'],
                        )}
                        length="100%"
                    />
                    <Line
                        className={cx(
                            styles.center,
                            styles['line-shadow'],
                        )}
                        length="100%"
                        vertical
                    />
                    <Circle
                        className={cx(
                            styles.center,
                            styles['line-shadow'],
                        )}
                        diameter={20}
                    />
                    <Circle
                        className={cx(
                            styles.center,
                            styles['line-shadow'],
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
                </div>
            </div>
            <div className={styles['image-scale-slider']}>
                <Slider
                    defaultValue={scale}
                    min={0.1}
                    max={10}
                    step={0.1}
                    tipFormatter={null}
                    onChange={changeImageScale}
                />
            </div>
        </div>
    );
};

export default Webcam;
