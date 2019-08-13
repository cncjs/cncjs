import noop from 'lodash/noop';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { Button } from 'app/components/Buttons';
import Input from 'app/components/FormControl/Input';
import Select from 'app/components/FormControl/Select';
import FormGroup from 'app/components/FormGroup';
import Label from 'app/components/Label';
import Margin from 'app/components/Margin';
import Modal from 'app/components/Modal';
import { RadioButton } from 'app/components/Radio';
import i18n from 'app/lib/i18n';
import log from 'app/lib/log';
import MutedText from './MutedText';
import {
    MEDIA_SOURCE_LOCAL,
    MEDIA_SOURCE_MJPEG
} from './constants';

class Settings extends Component {
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

        return (
            <Modal
                size="sm"
                disableOverlayClick
                onClose={this.handleCancel}
            >
                <Modal.Header>
                    <Modal.Title>{i18n._('Webcam Settings')}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <FormGroup>
                        <div>
                            <Label>
                                {i18n._('Media Source')}
                            </Label>
                        </div>
                        <Margin bottom={8}>
                            <Margin bottom={4}>
                                <RadioButton
                                    label={i18n._('Use a built-in camera or a connected webcam')}
                                    name="mediaSource"
                                    value={MEDIA_SOURCE_LOCAL}
                                    checked={mediaSource === MEDIA_SOURCE_LOCAL}
                                    onChange={() => {
                                        this.setState({ mediaSource: MEDIA_SOURCE_LOCAL });
                                    }}
                                />
                            </Margin>
                            <Margin left={20}>
                                <Select
                                    disabled={mediaSource !== MEDIA_SOURCE_LOCAL}
                                    onChange={this.handleChangeVideoDevice}
                                    placeholder={i18n._('Choose a video device')}
                                    value={deviceId}
                                >
                                    <option value="">
                                        {i18n._('Automatic detection')}
                                    </option>
                                    {videoDevices.map(device => (
                                        <option key={device.deviceId} value={device.deviceId}>
                                            {device.label || device.deviceId}
                                        </option>
                                    ))}
                                </Select>
                            </Margin>
                        </Margin>
                        <Margin bottom={8}>
                            <Margin bottom={4}>
                                <RadioButton
                                    label={i18n._('Connect to an IP camera')}
                                    name="mediaSource"
                                    value={MEDIA_SOURCE_MJPEG}
                                    checked={mediaSource === MEDIA_SOURCE_MJPEG}
                                    onChange={() => {
                                        this.setState({ mediaSource: MEDIA_SOURCE_MJPEG });
                                    }}
                                />
                            </Margin>
                            <Margin left={20}>
                                <Input
                                    type="url"
                                    disabled={mediaSource !== MEDIA_SOURCE_MJPEG}
                                    placeholder="http://0.0.0.0:8080/?action=stream"
                                    defaultValue={url}
                                    onChange={this.handleChangeURL}
                                />
                                <Margin top={4}>
                                    <MutedText>
                                        {i18n._('The URL must be for a Motion JPEG (mjpeg) HTTP or RTSP stream.')}
                                    </MutedText>
                                </Margin>
                            </Margin>
                        </Margin>
                    </FormGroup>
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        btnStyle="default"
                        onClick={this.handleCancel}
                    >
                        {i18n._('Cancel')}
                    </Button>
                    <Button
                        btnStyle="primary"
                        onClick={this.handleSave}
                    >
                        {i18n._('Save Changes')}
                    </Button>
                </Modal.Footer>
            </Modal>
        );
    }
}

export default Settings;
