/* eslint jsx-a11y/media-has-caption: 0 */
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import log from 'app/lib/log';

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

    static requestToken = 0;

    static mountedInstances = [];

    static userMediaRequested = false;

    static getUserMedia = navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia;

    static isSupported() {
      return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) || !!Webcam.getUserMedia;
    }

    static stopStream(stream) {
      if (!stream) {
        return;
      }
      if (stream.stop) {
        stream.stop();
        return;
      }
      [].concat(
        stream.getVideoTracks ? stream.getVideoTracks() : [],
        stream.getAudioTracks ? stream.getAudioTracks() : []
      ).forEach(track => track.stop());
    }

    state = {
      hasUserMedia: false,
      stream: null,
    };

    video = null;

    canvas = null;

    ctx = null;

    componentDidMount() {
      if (!Webcam.isSupported()) {
        return;
      }

      Webcam.mountedInstances.push(this);

      if (!this.state.hasUserMedia && !Webcam.userMediaRequested) {
        this.requestUserMedia();
      }
    }

    componentDidUpdate(prevProps) {
      if (prevProps.video !== this.props.video || prevProps.audio !== this.props.audio) {
        // A different device was selected: release the current one, then open the new one
        Webcam.stopStream(this.state.stream);
        Webcam.userMediaRequested = false;
        this.requestUserMedia();
        return;
      }

      if (this.video.srcObject !== this.state.stream) {
        this.video.srcObject = this.state.stream;
      }
    }

    componentWillUnmount() {
      const index = Webcam.mountedInstances.indexOf(this);
      if (index >= 0) {
        Webcam.mountedInstances.splice(index, 1);
      }

      const { hasUserMedia, stream } = this.state;

      if (Webcam.mountedInstances.length === 0 && hasUserMedia) {
        Webcam.stopStream(stream);
        Webcam.userMediaRequested = false;
        window.URL.revokeObjectURL(stream);
      }

      this.canvas = null;
      this.ctx = null;
    }

    buildConstraints({ fallback = false } = {}) {
      const { audio, video } = this.props;
      const pick = (value) => {
        if (!fallback && typeof value === 'string' && value.length > 0) {
          return { deviceId: { exact: value } };
        }
        return !!value;
      };
      return { audio: pick(audio), video: pick(video) };
    }

    requestUserMedia() {
      if (!Webcam.isSupported()) {
        return;
      }

      const token = ++Webcam.requestToken;

      const request = (constraints) => {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          return navigator.mediaDevices.getUserMedia(constraints);
        }
        return new Promise((resolve, reject) => {
          Webcam.getUserMedia.call(navigator, constraints, resolve, reject);
        });
      };

      request(this.buildConstraints())
        .catch((err) => {
          // The saved device may be gone (unplugged): fall back to the default device
          if (err && (err.name === 'OverconstrainedError' || err.name === 'NotFoundError')) {
            log.warn('Webcam: the selected device is unavailable, using the default device');
            return request(this.buildConstraints({ fallback: true }));
          }
          if (err && this.props.audio &&
              (err.name === 'NotReadableError' || (err.name === 'NotAllowedError' && /system/i.test(err.message)))) {
            log.warn('Webcam: audio is unavailable, showing video only');
            return request({ ...this.buildConstraints(), audio: false });
          }
          throw err;
        })
        .then((stream) => {
          if (token !== Webcam.requestToken || Webcam.mountedInstances.length === 0) {
            // Superseded by a newer request, or nobody is mounted anymore: do not leak the device
            Webcam.stopStream(stream);
            return;
          }
          Webcam.userMediaRequested = true;
          Webcam.mountedInstances.forEach(instance => {
            instance.setState({ hasUserMedia: true, stream: stream });
          });
        })
        .catch((err) => {
          log.error(`${err.name}: ${err.message}`);
          if (token === Webcam.requestToken) {
            Webcam.userMediaRequested = false;
            Webcam.mountedInstances.forEach(instance => {
              instance.setState({ hasUserMedia: false, stream: null });
            });
          }
        });
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
