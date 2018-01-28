import noop from 'lodash/noop';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import ReactDOM from 'react-dom';
import Modal from '../../components/Modal';
import i18n from '../../lib/i18n';
import {
    MEDIA_SOURCE_LOCAL,
    MEDIA_SOURCE_MJPEG
} from './constants';

class Settings extends PureComponent {
    static propTypes = {
        mediaSource: PropTypes.string,
        url: PropTypes.string,
        onSave: PropTypes.func,
        onClose: PropTypes.func
    };
    static defaultProps = {
        mediaSource: MEDIA_SOURCE_LOCAL,
        url: '',
        onSave: noop,
        onClose: noop
    };

    state = {
        show: true,
        mediaSource: this.props.mediaSource,
        url: this.props.url
    };
    actions = {
        handleChangeURL: (event) => {
            const url = event.target.value;
            this.setState({ url });
        },
        handleSave: () => {
            this.setState({ show: false });

            this.props.onSave({
                mediaSource: this.state.mediaSource,
                url: this.state.url
            });
        },
        handleCancel: () => {
            this.setState({ show: false });
        }
    };

    componentDidUpdate(prevProps, prevState) {
        if (!(this.state.show)) {
            this.props.onClose();
        }
    }
    render() {
        const { show, mediaSource, url } = this.state;

        return (
            <Modal
                show={show}
                size="sm"
                disableOverlay
                onClose={this.actions.handleCancel}
            >
                <Modal.Header>
                    <Modal.Title>{i18n._('Webcam Settings')}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="form-group">
                        <label><strong>{i18n._('Media Source')}</strong></label>
                        <div className="radio" style={{ marginTop: 0 }}>
                            <label>
                                <input
                                    type="radio"
                                    name="mediaSource"
                                    value={MEDIA_SOURCE_LOCAL}
                                    checked={mediaSource === MEDIA_SOURCE_LOCAL}
                                    onChange={() => {
                                        this.setState({ mediaSource: MEDIA_SOURCE_LOCAL });
                                    }}
                                />
                                {i18n._('Use a built-in camera or a connected webcam')}
                            </label>
                        </div>
                        <div className="radio">
                            <label>
                                <input
                                    type="radio"
                                    name="mediaSource"
                                    value={MEDIA_SOURCE_MJPEG}
                                    checked={mediaSource === MEDIA_SOURCE_MJPEG}
                                    onChange={() => {
                                        this.setState({ mediaSource: MEDIA_SOURCE_MJPEG });
                                    }}
                                />
                                {i18n._('Use a M-JPEG stream over HTTP')}
                            </label>
                        </div>
                        <div style={{ marginLeft: 20 }}>
                            <input
                                type="url"
                                className="form-control"
                                disabled={mediaSource !== MEDIA_SOURCE_MJPEG}
                                placeholder="http://raspberrypi:8080/?action=stream"
                                defaultValue={url}
                                onChange={this.actions.handleChangeURL}
                            />
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <button
                        type="button"
                        className="btn btn-default"
                        onClick={this.actions.handleCancel}
                    >
                        {i18n._('Cancel')}
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={this.actions.handleSave}
                    >
                        {i18n._('Save Changes')}
                    </button>
                </Modal.Footer>
            </Modal>
        );
    }
}

export const show = (options) => new Promise((resolve, reject) => {
    const el = document.body.appendChild(document.createElement('div'));
    const removeContainer = (el) => {
        setTimeout(() => {
            ReactDOM.unmountComponentAtNode(el);
            el.remove();
        }, 0);
    };

    const props = {
        ...options,
        onSave: (data) => {
            removeContainer(el);
            resolve(data);
        },
        onClose: () => {
            removeContainer(el);
        }
    };

    ReactDOM.render(<Settings {...props} />, el);
});

export default Settings;
