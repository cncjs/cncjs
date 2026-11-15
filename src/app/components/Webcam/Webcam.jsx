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

    static stream = null;

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
      if (Webcam.stream) {
        // Attach the stream already owned by the mounted instances.
        // eslint-disable-next-line react/no-did-mount-set-state
        this.setState({ hasUserMedia: true, stream: Webcam.stream });
      } else if (!Webcam.userMediaRequested) {
        this.requestUserMedia();
      }
    }

    componentDidUpdate(prevProps) {
      if (prevProps.video !== this.props.video || prevProps.audio !== this.props.audio) {
        Webcam.stopStream(Webcam.stream);
        Webcam.stream = null;
        Webcam.mountedInstances.forEach(instance => {
          instance.setState({ hasUserMedia: false, stream: null });
        });
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

      if (Webcam.mountedInstances.length === 0) {
        Webcam.requestToken += 1;
        Webcam.stopStream(Webcam.stream);
        Webcam.stream = null;
        Webcam.userMediaRequested = false;
      }

      this.canvas = null;
      this.ctx = null;
    }

    buildConstraints() {
      const pick = (value) => {
        if (typeof value === 'string' && value.length > 0) {
          return { deviceId: { exact: value } };
        }
        return !!value;
      };
      return { audio: pick(this.props.audio), video: pick(this.props.video) };
    }

    requestUserMedia() {
      if (!Webcam.isSupported()) {
        return;
      }

      const token = ++Webcam.requestToken;
      const constraints = this.buildConstraints();
      const selectedVideo = typeof this.props.video === 'string' && this.props.video.length > 0;
      const isCurrent = () => token === Webcam.requestToken && Webcam.mountedInstances.length > 0;
      const isMissing = err => err && (err.name === 'OverconstrainedError' || err.name === 'NotFoundError');
      const request = (nextConstraints) => {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          return navigator.mediaDevices.getUserMedia(nextConstraints);
        }
        return new Promise((resolve, reject) => {
          Webcam.getUserMedia.call(navigator, nextConstraints, resolve, reject);
        });
      };

      Webcam.userMediaRequested = true;
      request(constraints)
        .catch((err) => {
          if (!isCurrent()) {
            return null;
          }
          if (selectedVideo && isMissing(err)) {
            log.warn('Webcam: a media device is unavailable, trying the default camera');
            return request({ ...constraints, video: true });
          }
          throw err;
        })
        .catch((err) => {
          if (!isCurrent()) {
            return null;
          }
          if (constraints.audio && constraints.video && err &&
              (isMissing(err) || err.name === 'NotAllowedError' || err.name === 'NotReadableError')) {
            log.warn('Webcam: unable to open audio and video, trying video only');
            return request({ ...constraints, audio: false }).catch((videoErr) => {
              if (!isCurrent()) {
                return null;
              }
              if (selectedVideo && isMissing(videoErr)) {
                return request({ ...constraints, audio: false, video: true });
              }
              throw videoErr;
            });
          }
          throw err;
        })
        .then((stream) => {
          if (!stream) {
            return;
          }
          if (!isCurrent()) {
            Webcam.stopStream(stream);
            return;
          }
          Webcam.stream = stream;
          Webcam.mountedInstances.forEach(instance => {
            instance.setState({ hasUserMedia: true, stream: stream });
          });
        })
        .catch((err) => {
          if (isCurrent()) {
            log.error(`${err.name}: ${err.message}`);
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
