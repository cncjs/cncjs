import _ from 'lodash';
import delay from 'delay';
import React, { Component, PropTypes } from 'react';
import { ButtonToolbar, ButtonGroup, Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import CSSModules from 'react-css-modules';
import Anchor from '../../common/Anchor';
import i18n from '../../../lib/i18n';
import Slider from 'rc-slider';
import Image from './Image';
import Line from './Line';
import Circle from './Circle';
import styles from './index.styl';

@CSSModules(styles, { allowMultiple: true })
class Webcam extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    shouldComponentUpdate(nextProps, nextState) {
        return !_.isEqual(nextProps, this.props);
    }
    refresh() {
        const { state } = this.props;
        const { url } = state;

        this.refs['webcam-viewport'].src = '';

        delay(10) // delay 10ms
            .then(() => {
                this.refs['webcam-viewport'].src = url;
            });
    }
    render() {
        const { state, actions } = this.props;
        const { disabled, url, crosshair, scale } = state;

        if (disabled) {
            return (
                <div styleName="webcam-off-container">
                    <h4><i styleName="icon-webcam"></i></h4>
                    <h5>{i18n._('Webcam is off')}</h5>
                </div>
            );
        }

        return (
            <div styleName="webcam-on-container">
            {url &&
                <Image
                    src={url}
                    ref="webcam-viewport"
                    style={{
                        width: (100 * scale).toFixed(0) + '%',
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)'
                    }}
                />
            }
            {crosshair &&
                <div>
                    <Line
                        styleName="center line-shadow"
                        length="100%"
                    />
                    <Line
                        styleName="center line-shadow"
                        length="100%"
                        vertical
                    />
                    <Circle
                        styleName="center line-shadow"
                        diameter={20}
                    />
                    <Circle
                        styleName="center line-shadow"
                        diameter={40}
                    />
                </div>
            }
                <div styleName="toolbar">
                    <div styleName="scale-text">{scale}x</div>
                    <OverlayTrigger
                        overlay={<Tooltip>{i18n._('Crosshair')}</Tooltip>}
                        placement="top"
                    >
                        <Anchor
                            styleName="btn-crosshair"
                            onClick={(event) => {
                                actions.toggleCrosshair();
                            }}
                        >
                            <i className="fa fa-crosshairs"></i>
                        </Anchor>
                    </OverlayTrigger>
                </div>

                <div styleName="image-scale-slider">
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
