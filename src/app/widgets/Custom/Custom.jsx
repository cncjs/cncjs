import { Box } from '@tonic-ui/react';
import { ensurePositiveNumber } from 'ensure-type';
import Uri from 'jsuri';
import _get from 'lodash/get';
import pubsub from 'pubsub-js';
import React, { useContext, useEffect, useRef } from 'react';
import settings from '@app/config/settings';
import Iframe from '@app/components/Iframe';
import controller from '@app/lib/controller';
import i18n from '@app/lib/i18n';
import config from '@app/store/config';
import { WidgetConfigContext } from '@app/widgets/shared/context';
import useWidgetConfig from '@app/widgets/shared/useWidgetConfig';
import useWidgetEvent from '@app/widgets/shared/useWidgetEvent';

function Custom({
  disabled,
  isFullscreen,
}) {
  const widgetConfig = useWidgetConfig();
  const widgetEmitter = useWidgetEvent();
  const url = widgetConfig.get('url');
  const iframeRef = useRef(null);
  const widgetId = useContext(WidgetConfigContext);
  const messageListenersRef = useRef(null);
  const token = config.get('session.token');

  useEffect(() => {
    const reload = (forceGet = false) => {
      const iframe = iframeRef.current;
      if (!iframe) {
        return;
      }

      iframe.src = new Uri(url)
        .addQueryParam('token', token)
        .toString();

      try {
        // Reload
        iframe.contentWindow.location.reload(forceGet);
      } catch (err) {
        // Catch DOMException when accessing the 'contentDocument' property from a cross-origin frame
        console.error(err);
      }
    };

    widgetEmitter.on('refresh', reload);

    return () => {
      widgetEmitter.off('refresh', reload);
      iframeRef.current = null;
    };
  }, [widgetEmitter, token, url]);

  useEffect(() => {
    const postMessage = (type = '', payload) => {
      const iframe = iframeRef.current;
      const target = _get(iframe, 'contentWindow');
      if (!target) {
        return;
      }

      const message = {
        token: token,
        version: settings.version,
        action: {
          type: type,
          payload: {
            ...payload
          }
        }
      };

      target.postMessage(message, '*');
    };

    const resize = (options) => {
      const iframe = iframeRef.current;
      if (!iframe) {
        return;
      }

      let { width = 0, height = 0 } = { ...options };
      width = ensurePositiveNumber(width);
      height = ensurePositiveNumber(height);

      if (!height) {
        try {
          const target = iframe.contentDocument.body;
          if (target) {
            height = target.scrollHeight;
          }
        } catch (err) {
          // Catch DOMException when accessing the 'contentDocument' property from a cross-origin frame
        }
      }

      if (width > 0) {
        // Recalculate the width
        iframe.style.width = 0;
        iframe.style.width = `${width}px`;
      }
      if (height > 0) {
        // Recalculate the height
        iframe.style.height = 0;
        iframe.style.height = `${height}px`;
      }
    };

    const subscribe = () => {
      if (messageListenersRef.current) {
        return;
      }

      const tokens = [
        pubsub.subscribe('message:connect', () => {
          // Post a message to the iframe window
          postMessage('change', {
            fullscreen: isFullscreen,
            controller: {
              type: _get(controller, 'type'),
            },
            connection: {
              type: _get(controller, 'connection.type'),
              ident: _get(controller, 'connection.ident'),
              options: _get(controller, 'connection.options'),
            },
          });
        }),
        pubsub.subscribe('widget:fullscreenchange', (type, payload) => {
          if (!disabled && payload.widgetId === widgetId) {
            postMessage('widget:fullscreenchange', { fullscreen: payload.fullscreen });
          }
        }),
        pubsub.subscribe('message:resize', (type, payload) => {
          const { scrollHeight } = { ...payload };
          resize({
            height: scrollHeight,
          });
        }),
      ];

      messageListenersRef.current = () => {
        tokens.forEach((listenerToken) => {
          pubsub.unsubscribe(listenerToken);
        });
        messageListenersRef.current = null;
      };
    };

    subscribe();

    return () => {
      messageListenersRef.current?.();
    };
  }, [disabled, isFullscreen, token, widgetId]);

  if (disabled) {
    return (
      <Box
        px="2x"
        py="3x"
        color="text.tertiary"
      >
        {i18n._('The widget is currently disabled')}
      </Box>
    );
  }

  if (!url) {
    return (
      <Box
        px="2x"
        py="3x"
        color="text.tertiary"
      >
        {i18n._('URL not configured')}
      </Box>
    );
  }

  const iframeSrc = new Uri(url)
    .addQueryParam('token', token)
    .toString();

  return (
    <Iframe
      src={iframeSrc}
      sx={{ verticalAlign: 'top' }}
      onLoad={({ iframe }) => {
        if (!iframe) {
          return;
        }

        iframeRef.current = iframe;
        /*
        const target = iframe.contentDocument.body;
        const nextHeight = target.offsetHeight;
        iframe.style.height = `${nextHeight}px`;

        const observer = new ResizeObserver(entries => {
          const target = iframe.contentDocument.body;
          const nextHeight = target.offsetHeight;
          iframe.style.height = `${nextHeight}px`;
        });
        observer.observe(target);
        */
      }}
      onBeforeUnload={() => {
        iframeRef.current = null;
        messageListenersRef.current?.();
      }}
      onUnload={() => {
        iframeRef.current = null;
        messageListenersRef.current?.();
      }}
      onError={() => {
        iframeRef.current = null;
        messageListenersRef.current?.();
      }}
    />
  );
}

export default Custom;
