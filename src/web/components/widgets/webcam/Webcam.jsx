import React from 'react';
import Iframe from '../../common/Iframe';
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

    onEdit() {
        webcamSettings.show(() => {
            this.setState({
                url: store.get('widgets.webcam.url')
            });
        });
    }
    onRefresh() {
        this.refs.iframe.reload();
    }
    render() {
        const { disabled } = this.props;
        const { url } = this.state;

        return (
            <div>
                {!disabled &&
                <div className="webcam-on-container">
                    <Iframe url={url} ref="iframe" />
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
