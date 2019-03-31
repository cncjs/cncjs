import noop from 'lodash/noop';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Select from 'react-select';
import Modal from '../../components/Modal';
import i18n from '../../lib/i18n';
import log from '../../lib/log';
import {
    MEDIA_SOURCE_LOCAL,
    MEDIA_SOURCE_MJPEG
} from './constants';

class Settings extends PureComponent {
    static propTypes = {
        mediaSource: PropTypes.string,
        deviceId: PropTypes.string,
        url: PropTypes.string,
        onSave: PropTypes.func,
        onCancel: PropTypes.func
    };
    static defaultProps = {
        mediaSource: MEDIA_SOURCE_LOCAL,
        deviceId: '',
        url: '',
        onSave: noop,
        onCancel: noop
    };

    state = {
        mediaSource: this.props.mediaSource,
        deviceId: this.props.deviceId,
        url: this.props.url,
        videoDevices: []
    };

    handleChangeVideoDevice = (option) => {
        const deviceId = option.value;
        this.setState({ deviceId: deviceId });
    };

    handleChangeURL = (event) => {
        const url = event.target.value;
        this.setState({ url: url });
    };

    handleSave = () => {
        this.props.onSave && this.props.onSave({
            mediaSource: this.state.mediaSource,
            deviceId: this.state.deviceId,
            url: this.state.url
        });
    };

    handleCancel = () => {
        this.props.onCancel && this.props.onCancel();
    };

    enumerateDevices = async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
            // enumerateDevices() not supported.
            return;
        }

        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => (device.kind === 'videoinput'));
            this.setState({ videoDevices: videoDevices });
        } catch (err) {
            log.error(err.name + ': ' + err.message);
        }
    };

    componentDidMount() {
        this.enumerateDevices();
    }

    render() {
        const {
            mediaSource,
            deviceId,
            url,
            videoDevices
        } = this.state;

        const videoDeviceOptions = videoDevices.map(device => ({
            value: device.deviceId,
            label: device.label
        }));
        videoDeviceOptions.unshift({
            value: '',
            label: i18n._('Automatic detection')
        });

        return (
            <Modal disableOverlay size="sm" onClose={this.handleCancel}>
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
                        <div style={{ marginLeft: 20 }}>
                            <Select
                                backspaceRemoves={false}
                                clearable={false}
                                disabled={mediaSource !== MEDIA_SOURCE_LOCAL}
                                name="videoDevice"
                                noResultsText={i18n._('No video devices available')}
                                onChange={this.handleChangeVideoDevice}
                                optionRenderer={(device) => device.label || device.deviceId}
                                options={videoDeviceOptions}
                                placeholder={i18n._('Choose a video device')}
                                searchable={false}
                                value={deviceId}
                            />
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
                                onChange={this.handleChangeURL}
                            />
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <button
                        type="button"
                        className="btn btn-default"
                        onClick={this.handleCancel}
                    >
                        {i18n._('Cancel')}
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={this.handleSave}
                    >
                        {i18n._('Save Changes')}
                    </button>
                </Modal.Footer>
            </Modal>
        );
    }
}

export default Settings;
