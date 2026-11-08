import { useEffect, useRef } from 'react';

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
    const getUserMedia = navigator.mediaDevices?.getUserMedia;
    if (!getUserMedia) {
      return undefined;
    }
    let disposed = false;
    let stream;
    getUserMedia.call(navigator.mediaDevices, { audio: !!audio, video: video || true }).then(nextStream => {
      if (disposed) {
        stopStream(nextStream);
        return;
      }
      stream = nextStream;
      element.srcObject = stream;
    }).catch(() => {});
    return () => {
      disposed = true;
      element.srcObject = null;
      stopStream(stream);
    };
  }, [audio, video]);
  return videoRef;
}
