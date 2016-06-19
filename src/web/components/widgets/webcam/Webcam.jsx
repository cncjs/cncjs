import delay from 'delay';
import React from 'react';
import i18n from '../../../lib/i18n';
import store from '../../../store';
import * as webcamSettings from './WebcamSettings';

class Webcam extends React.Component {
    static propTypes = {
        disabled: React.PropTypes.bool.isRequired
    };
    state = {
        url: store.get('widgets.webcam.url')
    };

    changeSettings() {
        webcamSettings.show(() => {
            this.setState({
                url: store.get('widgets.webcam.url')
            });
        });
    }
    refresh() {
        this.refs['webcam-viewport'].src = '';

        delay(10) // delay 10ms
            .then(() => {
                this.refs['webcam-viewport'].src = this.state.url;
            });
    }
    render() {
        const { disabled } = this.props;
        const { url } = this.state;

        return (
            <div>
            {!disabled &&
                <div className="webcam-on-container">
                    <img
                        src={url}
                        className="webcam-viewport"
                        ref="webcam-viewport"
                        alt=""
                    />
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
