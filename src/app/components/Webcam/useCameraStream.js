import { useEffect, useRef } from 'react';
import log from '@app/lib/log';

const mediaConstraint = value => (
  typeof value === 'string' && value.length > 0
    ? { deviceId: { exact: value } }
    : !!value
);

const isMissingDevice = error => (
  error && (error.name === 'OverconstrainedError' || error.name === 'NotFoundError')
);

function stopStream(stream) {
  if (stream?.getTracks) {
    stream.getTracks().forEach(track => track.stop());
  } else if (stream?.stop) {
    stream.stop();
  }
}

export default function useCameraStream(audio, video) {
  const videoRef = useRef(null);
  useEffect(() => {
    const element = videoRef.current;
    const mediaDevices = navigator.mediaDevices;
    const getUserMedia = mediaDevices?.getUserMedia;
    const legacyGetUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia || navigator.msGetUserMedia;
    if (!getUserMedia && !legacyGetUserMedia) {
      return undefined;
    }
    const constraints = { audio: mediaConstraint(audio), video: mediaConstraint(video) };
    const selectedVideo = typeof video === 'string' && video.length > 0;
    const request = nextConstraints => new Promise((resolve, reject) => {
      if (getUserMedia) {
        resolve(getUserMedia.call(mediaDevices, nextConstraints));
      } else {
        legacyGetUserMedia.call(navigator, nextConstraints, resolve, reject);
      }
    });
    let disposed = false;
    let stream;

    request(constraints)
      .catch(error => {
        if (disposed) {
          return null;
        }
        if (selectedVideo && isMissingDevice(error)) {
          log.warn('Webcam: a media device is unavailable, trying the default camera');
          return request({ ...constraints, video: true });
        }
        throw error;
      })
      .catch(error => {
        if (disposed) {
          return null;
        }
        if (constraints.audio && constraints.video && error &&
            (isMissingDevice(error) || error.name === 'NotAllowedError' || error.name === 'NotReadableError')) {
          log.warn('Webcam: unable to open audio and video, trying video only');
          return request({ ...constraints, audio: false }).catch(videoError => {
            if (disposed) {
              return null;
            }
            if (selectedVideo && isMissingDevice(videoError)) {
              return request({ ...constraints, audio: false, video: true });
            }
            throw videoError;
          });
        }
        throw error;
      })
      .then(nextStream => {
        if (!nextStream) {
          return;
        }
        if (disposed) {
          stopStream(nextStream);
          return;
        }
        stream = nextStream;
        element.srcObject = stream;
      })
      .catch(error => {
        if (!disposed) {
          log.error(`${error?.name}: ${error?.message}`);
        }
      });
    return () => {
      disposed = true;
      element.srcObject = null;
      stopStream(stream);
    };
  }, [audio, video]);
  return videoRef;
}
