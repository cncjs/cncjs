import { Box } from '@tonic-ui/react';
import React from 'react';
import useIframeEvents from './useIframeEvents';

const noop = () => {};

const defaultSandbox = {
  allowForms: true,
  allowModals: true,
  allowPointerLock: false,
  allowPopups: true,
  allowSameOrigin: true,
  allowScripts: true,
  allowTopNavigation: false,
};
const mapSandbox = sandbox => Object.keys(sandbox)
  .filter(key => sandbox[key])
  .map(key => key.replace(/[A-Z]/g, '-$&').toLowerCase())
  .join(' ');

/**
 * @param {{ src?: string, width?: number|string, height?: number|string, title?: string,
 * sandbox?: boolean|string|object, style?: object,
 * onLoad?: (payload: {event: Event, iframe: HTMLIFrameElement}) => void,
 * onBeforeUnload?: (payload: {event: Event, iframe: HTMLIFrameElement}) => void,
 * onError?: (event: Event) => void,
 * onUnload?: (payload: {event: Event}) => void, [key: string]: unknown }} props
 */
function Iframe({ width = '100%', height = '100%', title = 'Custom widget', sandbox = defaultSandbox,
  style, onLoad = noop, onBeforeUnload = noop, onUnload = noop, onError, ...props }) {
  const iframeRef = useIframeEvents({ onLoad, onBeforeUnload, onUnload, onError });
  let sandboxValue = sandbox;
  if (sandbox === false) {
    sandboxValue = undefined;
  } else if (sandbox && typeof sandbox === 'object') {
    sandboxValue = mapSandbox(sandbox);
  }
  return (
    <Box
      as="iframe" {...props} ref={iframeRef}
      width={width} height={height} title={title}
      sandbox={sandboxValue} style={{ borderWidth: 0, ...style }}
    />
  );
}

export default Iframe;
