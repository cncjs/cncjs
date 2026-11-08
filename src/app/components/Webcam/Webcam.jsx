/* eslint jsx-a11y/media-has-caption: 0 */
import { Box } from '@tonic-ui/react';
import React from 'react';
import useCameraStream from './useCameraStream';

/**
 * @param {{ audio?: boolean|string, video?: boolean|string, [key: string]: unknown }} props
 */
function Webcam({ audio = true, video = true, ...props }) {
  const videoRef = useCameraStream(audio, video);
  return <Box as="video" {...props} ref={videoRef} />;
}

export default Webcam;
