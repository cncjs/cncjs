import React, { Component, PropTypes } from 'react';
import { findDOMNode } from 'react-dom';

class Webcam extends Component {
    static propTypes = {
        // Video props
        autoPlay: PropTypes.bool,
        muted: PropTypes.bool,
        width: PropTypes.oneOfType([
            PropTypes.number,
            PropTypes.string
        ]),
        height: PropTypes.oneOfType([
            PropTypes.number,
            PropTypes.string
        ]),
        // Webcam props
        audio: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
        video: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
        screenshotFormat: PropTypes.oneOf([
            'image/webp',
            'image/png',
            'image/jpeg'
        ])
    };
    static defaultProps = {
        autoPlay: true,
        muted: false,
        width: 640,
        height: 480,
        audio: true,
        video: true,
        screenshotFormat: 'image/webp'
    };
    static mountedInstances = [];
    static userMediaRequested = false;
    static getUserMedia = navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia;

    state = {
        hasUserMedia: false,
        src: null
    };
    stream = null;
    canvas = null;
    ctx = null;

    componentDidMount() {
        if (!Webcam.getUserMedia) {
            return;
        }

        Webcam.mountedInstances.push(this);

        if (!this.state.hasUserMedia && !Webcam.userMediaRequested) {
            this.requestUserMedia();
        }
    }
    componentWillUnmount() {
        const index = Webcam.mountedInstances.indexOf(this);
        Webcam.mountedInstances.splice(index, 1);

        if (Webcam.mountedInstances.length === 0 && this.state.hasUserMedia) {
            if (this.stream.stop) {
                this.stream.stop();
            } else {
                if (this.stream.getVideoTracks) {
                    for (let track of this.stream.getVideoTracks()) {
                        track.stop();
                    }
                }

                if (this.stream.getAudioTracks) {
                    for (let track of this.stream.getAudioTracks()) {
                        track.stop();
                    }
                }
            }
            Webcam.userMediaRequested = false;
            window.URL.revokeObjectURL(this.state.src);
        }
    }
    requestUserMedia() {
        if (!Webcam.getUserMedia) {
            return;
        }

        const getUserMedia = (constraints) => {
            Webcam.getUserMedia.call(navigator,
                constraints,
                (stream) => {
                    Webcam.mountedInstances.forEach(instance => {
                        instance.stream = stream;
                        instance.setState({
                            hasUserMedia: true,
                            src: window.URL.createObjectURL(stream)
                        });
                        instance.props.onGetUserMedia();
                    });
                    Webcam.userMediaRequested = true;
                },
                (err) => {
                    Webcam.mountedInstances.forEach(instance => {
                        instance.stream = null;
                        instance.setState({
                            hasUserMedia: false,
                            src: null
                        });
                    });
                    Webcam.userMediaRequested = false;
                }
            );
        };

        const { audio, video } = this.props;
        const constraints = {
            audio: !!audio,
            video: !!video
        };
        if (typeof video === 'string' && video.length > 0) {
            constraints.video = {
                optional: [{ sourceId: video }]
            };
        }
        if (typeof audio === 'string' && audio.length > 0) {
            constraints.audio = {
                optional: [{ sourceId: audio }]
            };
        }

        if (!('mediaDevices' in navigator)) {
            getUserMedia(constraints);
            return;
        }

        navigator.mediaDevices.enumerateDevices().then(devices => {
            devices.forEach(device => {
                // audioinput
                if (device.kind === 'audioinput' && constraints.audio === true) {
                    constraints.audio = {
                        optional: [{ sourceId: device.deviceId }]
                    };
                }
                // videoinput
                if (device.kind === 'videoinput' && constraints.video === true) {
                    constraints.video = {
                        optional: [{ sourceId: device.deviceId }]
                    };
                }
            });

            getUserMedia(constraints);
        })
        .catch(error => {
            console.error(`${error.name}: ${error.message}`); // eslint-disable-line no-console
        });

        // https://www.chromestatus.com/feature/4765305641369600
        // Remove support for the MediaStreamTrack.getSources() method.
        // This method was removed from the spec in favor of MediaDevices.enumerateDevices().
        // This was deprecated in Chrome 40.
    }
    getScreenshot() {
        if (!this.state.hasUserMedia) {
            return null;
        }

        const canvas = this.getCanvas();
        return canvas ? canvas.toDataURL(this.props.screenshotFormat) : null;
    }
    getCanvas() {
        if (!this.state.hasUserMedia) {
            return null;
        }

        const video = findDOMNode(this);
        if (!this.ctx) {
            const canvas = document.createElement('canvas');
            const aspectRatio = video.videoWidth / video.videoHeight;

            canvas.width = video.clientWidth;
            canvas.height = video.clientWidth / aspectRatio;

            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
        }

        const { ctx, canvas } = this;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        return canvas;
    }
    render() {
        const { className, style, ...props } = this.props;

        delete props.audio;
        delete props.video;
        delete props.screenshotFormat;

        return (
            <video
                {...props}
                className={className}
                style={style}
                src={this.state.src}
            />
        );
    }
}

export default Webcam;
