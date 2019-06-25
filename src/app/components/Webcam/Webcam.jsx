/* eslint jsx-a11y/media-has-caption: 0 */
import PropTypes from 'prop-types';
import React, { Component } from 'react';

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
        stream: null,
    };

    video = null;

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

    componentDidUpdate() {
        if (this.video.srcObject !== this.state.stream) {
            this.video.srcObject = this.state.stream;
        }
    }

    componentWillUnmount() {
        const index = Webcam.mountedInstances.indexOf(this);
        Webcam.mountedInstances.splice(index, 1);

        const { hasUserMedia, stream } = this.state;

        if (Webcam.mountedInstances.length === 0 && hasUserMedia) {
            if (stream.stop) {
                stream.stop();
            } else {
                if (stream.getVideoTracks) {
                    for (let track of stream.getVideoTracks()) {
                        track.stop();
                    }
                }

                if (stream.getAudioTracks) {
                    for (let track of stream.getAudioTracks()) {
                        track.stop();
                    }
                }
            }
            Webcam.userMediaRequested = false;

            window.URL.revokeObjectURL(stream);
        }

        this.canvas = null;
        this.ctx = null;
    }

    requestUserMedia() {
        if (!Webcam.getUserMedia) {
            return;
        }

        const getUserMedia = (constraints) => {
            Webcam.getUserMedia.call(
                navigator,
                constraints,
                (stream) => {
                    Webcam.mountedInstances.forEach(instance => {
                        instance.setState({
                            hasUserMedia: true,
                            stream: stream
                        });
                    });
                    Webcam.userMediaRequested = true;
                },
                (err) => {
                    Webcam.mountedInstances.forEach(instance => {
                        instance.setState({
                            hasUserMedia: false,
                            stream: null
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
        }).catch(error => {
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

        if (!this.ctx) {
            const canvas = document.createElement('canvas');
            const aspectRatio = this.video.videoWidth / this.video.videoHeight;

            canvas.width = this.video.clientWidth;
            canvas.height = this.video.clientWidth / aspectRatio;

            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
        }

        const { ctx, canvas } = this;
        ctx.drawImage(this.video, 0, 0, canvas.width, canvas.height);

        return canvas;
    }

    render() {
        const {
            className,
            style,
            audio, // eslint-disable-line
            video, // eslint-disable-line
            screenshotFormat, // eslint-disable-line
            ...props
        } = this.props;

        return (
            <video
                {...props}
                ref={video => {
                    this.video = video;
                }}
                className={className}
                style={style}
            />
        );
    }
}

export default Webcam;
