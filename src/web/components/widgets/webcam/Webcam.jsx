import _ from 'lodash';
import delay from 'delay';
import React, { Component, PropTypes } from 'react';
import i18n from '../../../lib/i18n';

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
                <div className="webcam-on-container">
                {url &&
                    <img
                        src={url}
                        className="webcam-viewport"
                        ref="webcam-viewport"
                        alt=""
                    />
                }
                </div>
            }
            {disabled &&
                <div className="webcam-off-container">
                    <h4><i className="icon-webcam"></i></h4>
                    <h5>{i18n._('Webcam is off')}</h5>
                </div>
            }
            </div>
        );
    }
}

export default Webcam;
