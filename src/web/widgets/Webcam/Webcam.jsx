import classNames from 'classnames';
import delay from 'delay';
import Slider from 'rc-slider';
import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import shallowCompare from 'react-addons-shallow-compare';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import WebcamMedia from 'react-webcam';
import Anchor from '../../components/Anchor';
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

    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
    refresh() {
        const { state } = this.props;
        const { mediaSource } = state;

        if (mediaSource === MEDIA_SOURCE_MJPEG) {
            const node = ReactDOM.findDOMNode(this.mjpegMediaSource);
            node.src = '';

            delay(10) // delay 10ms
                .then(() => {
                    node.src = state.url;
                });
        }
    }
    render() {
        const { state, actions } = this.props;
        const {
            disabled,
            mediaSource,
            url,
            centerFocus,
            flipHorizontally,
            flipVertically,
            scale
        } = state;

        if (disabled) {
            return (
                <div className={styles['webcam-off-container']}>
                    <h4><i className={styles['icon-webcam']} /></h4>
                    <h5>{i18n._('Webcam is off')}</h5>
                </div>
            );
        }

        return (
            <div className={styles['webcam-on-container']}>
                {mediaSource === MEDIA_SOURCE_LOCAL &&
                <div style={{ width: '100%' }}>
                    <WebcamMedia
                        className={classNames(
                            styles.center,
                            { [styles.flipHorizontally]: flipHorizontally },
                            { [styles.flipVertically]: flipVertically }
                        )}
                        width={(100 * scale).toFixed(0) + '%'}
                        height="auto"
                    />
                </div>
                }
                {mediaSource === MEDIA_SOURCE_MJPEG &&
                <Image
                    ref={node => {
                        this.mjpegMediaSource = node;
                    }}
                    src={url}
                    style={{
                        width: (100 * scale).toFixed(0) + '%'
                    }}
                    className={classNames(
                        styles.center,
                        { [styles.flipHorizontally]: flipHorizontally },
                        { [styles.flipVertically]: flipVertically }
                    )}
                />
                }
                {centerFocus &&
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
                    <div className={styles['scale-text']}>{scale}x</div>
                    <div className="pull-right">
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
                            overlay={<Tooltip>{i18n._('Center Focus')}</Tooltip>}
                            placement="top"
                        >
                            <Anchor
                                className={styles.btnIcon}
                                onClick={actions.toggleCenterFocus}
                            >
                                <i
                                    className={classNames(
                                        styles.icon,
                                        styles.inverted,
                                        styles.iconCenterFocus
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
