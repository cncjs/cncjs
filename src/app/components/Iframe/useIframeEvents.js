import { useEffect, useRef } from 'react';

export default function useIframeEvents(callbacks) {
  const iframeRef = useRef(null);
  const latest = useRef(callbacks);
  latest.current = callbacks;
  useEffect(() => {
    const iframe = iframeRef.current;
    const handlers = {
      load: event => latest.current.onLoad?.({ event, iframe }),
      beforeunload: event => latest.current.onBeforeUnload?.({ event, iframe }),
      error: event => latest.current.onError?.(event),
      unload: event => latest.current.onUnload?.({ event }),
    };
    Object.entries(handlers).forEach(([name, handler]) => iframe.addEventListener(name, handler));
    return () => {
      Object.entries(handlers).forEach(([name, handler]) => iframe.removeEventListener(name, handler));
    };
  }, []);
  return iframeRef;
}
