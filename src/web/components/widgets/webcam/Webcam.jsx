import _ from 'lodash';
import delay from 'delay';
import React, { Component, PropTypes } from 'react';
import CSSModules from 'react-css-modules';
import Image from './Image';
import Line from './Line';
import Circle from './Circle';
import i18n from '../../../lib/i18n';
import styles from './index.styl';

@CSSModules(styles)
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
        const { state } = this.props;
        const { disabled, url } = state;

        return (
            <div>
            {!disabled &&
                <div styleName="webcam-on-container">
                {url &&
                    <Image
                        scale={1.0}
                        src={url}
                        ref="webcam-viewport"
                    />
                }
                    <Line
                        styleName="center"
                        length="100%"
                    />
                    <Line
                        styleName="center"
                        length="100%"
                        vertical
                    />
                    <Circle
                        styleName="center"
                        diameter={20}
                    />
                    <Circle
                        styleName="center"
                        diameter={40}
                    />
                </div>
            }
            {disabled &&
                <div styleName="webcam-off-container">
                    <h4><i styleName="icon-webcam"></i></h4>
                    <h5>{i18n._('Webcam is off')}</h5>
                </div>
            }
            </div>
        );
    }
}

export default Webcam;
