import classNames from 'classnames';
import Slider from 'rc-slider';
import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import shallowCompare from 'react-addons-shallow-compare';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import Anchor from '../../components/Anchor';
import WebcamComponent from '../../components/Webcam';
import i18n from '../../lib/i18n';
import Image from './Image';
import Line from './Line';
import Circle from './Circle';
import styles from './index.styl';
import {
    MEDIA_SOURCE_LOCAL,
    MEDIA_SOURCE_MJPEG
} from './constants';

class Webcam extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    mediaSource = null;

    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
    refresh() {
        const { state } = this.props;
        const { mediaSource } = state;

        if (mediaSource === MEDIA_SOURCE_MJPEG) {
            const el = ReactDOM.findDOMNode(this.mediaSource);
            el.src = '';

            setTimeout(() => {
                el.src = state.url;
            }, 10); // delay 10ms
        }
    }
    render() {
        const { state, actions } = this.props;
        const {
            disabled,
            mediaSource,
            url,
            scale,
            rotation,
            flipHorizontally,
            flipVertically,
            crosshair,
            muted
        } = state;

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
                {mediaSource === MEDIA_SOURCE_LOCAL &&
                <div style={{ width: '100%' }}>
                    <WebcamComponent
                        ref={node => {
                            this.mediaSource = node;
                        }}
                        className={styles.center}
                        style={{ transform: transformStyle }}
                        width={(100 * scale).toFixed(0) + '%'}
                        height="auto"
                        muted={muted}
                    />
                </div>
                }
                {mediaSource === MEDIA_SOURCE_MJPEG &&
                <Image
                    ref={node => {
                        this.mediaSource = node;
                    }}
                    src={url}
                    style={{
                        width: (100 * scale).toFixed(0) + '%',
                        transform: transformStyle
                    }}
                    className={styles.center}
                />
                }
                {crosshair &&
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
                }
                <div className={styles.toolbar}>
                    <div className={styles.scaleText}>{scale}x</div>
                    <div className="pull-right">
                        {mediaSource === MEDIA_SOURCE_LOCAL &&
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
                        }
                        <OverlayTrigger
                            overlay={<Tooltip>{i18n._('Rotate Left')}</Tooltip>}
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
                        </OverlayTrigger>
                        <OverlayTrigger
                            overlay={<Tooltip>{i18n._('Rotate Right')}</Tooltip>}
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
                        </OverlayTrigger>
                        <OverlayTrigger
                            overlay={<Tooltip>{i18n._('Flip Horizontally')}</Tooltip>}
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
                        </OverlayTrigger>
                        <OverlayTrigger
                            overlay={<Tooltip>{i18n._('Flip Vertically')}</Tooltip>}
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
                        </OverlayTrigger>
                        <OverlayTrigger
                            overlay={<Tooltip>{i18n._('Crosshair')}</Tooltip>}
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
                        </OverlayTrigger>
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
