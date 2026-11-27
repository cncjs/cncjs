import { Box } from '@tonic-ui/react';
import { useMergeRefs } from '@tonic-ui/react-hooks';
import React, { forwardRef } from 'react';
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
 * @param {{ src?: string, width?: number|string, height?: number|string,
 * sandbox?: boolean|string|object, style?: object,
 * onLoad?: (payload: {event: Event, iframe: HTMLIFrameElement}) => void,
 * onBeforeUnload?: (payload: {event: Event, iframe: HTMLIFrameElement}) => void,
 * onError?: (event: Event) => void,
 * onUnload?: (payload: {event: Event}) => void, [key: string]: unknown }} inProps
 */
const Iframe = forwardRef((inProps, ref) => {
  const {
    width = '100%',
    height = '100%',
    sandbox = defaultSandbox,
    onLoad = noop,
    onBeforeUnload = noop,
    onUnload = noop,
    onError,
    ...props
  } = inProps;
  const iframeRef = useIframeEvents({ onLoad, onBeforeUnload, onUnload, onError });
  const mergedRef = useMergeRefs(iframeRef, ref);
  let sandboxValue = sandbox;
  if (sandbox === false) {
    sandboxValue = undefined;
  } else if (sandbox && typeof sandbox === 'object') {
    sandboxValue = mapSandbox(sandbox);
  }
  return (
    <Box
      as="iframe" border={0} {...props}
      ref={mergedRef}
      width={width} height={height}
      sandbox={sandboxValue}
    />
  );
});

export default Iframe;
