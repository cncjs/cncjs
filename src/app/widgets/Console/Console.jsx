import _get from 'lodash/get';
import pubsub from 'pubsub-js';
import React, { useCallback, useEffect, useRef } from 'react';
import { connect } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';
import chalk from '@app/chalk';
import settings from '@app/config/settings';
import {
  CONNECTION_STATE_CONNECTED,
  CONNECTION_TYPE_SERIAL,
  CONNECTION_TYPE_SOCKET,
} from '@app/constants/connection';
import useEffectOnce from '@app/hooks/useEffectOnce';
import usePrevious from '@app/hooks/usePrevious';
import controller from '@app/lib/controller';
import i18n from '@app/lib/i18n';
import useWidgetEvent from '@app/widgets/shared/useWidgetEvent';
import Terminal from './Terminal';
import useTerminal from './useTerminal';
import styles from './index.styl';

function Console({
  isFullscreen,
  isConnected,
}) {
  const emitter = useWidgetEvent();
  const prevIsFullscreen = usePrevious(isFullscreen);
  const sender = useRef(uuidv4());
  const onData = useCallback((data) => {
    controller.write(data, {
      __sender__: sender.current,
    });
  }, []);
  const { containerRef, prompt, actions } = useTerminal({
    enabled: isConnected,
    cols: 254,
    rows: isFullscreen ? 'auto' : 15,
    cursorBlink: true,
    scrollback: 1000,
    tabStopWidth: 2,
    onData,
  });

  useEffectOnce(() => {
    const onConnectionOpen = (state) => {
      const { type, options } = state;

      const { productName, version } = settings;
      actions.writeln(chalk.white.bold(`${productName} ${version} [${controller.type}]`));

      if (type === CONNECTION_TYPE_SERIAL) {
        const { path, baudRate } = options;
        const line = i18n._('Connected to {{-path}} with a baud rate of {{baudRate}}', {
          path: chalk.yellowBright(path),
          baudRate: chalk.blueBright(baudRate),
        });
        actions.writeln(chalk.white(line));
      } else if (type === CONNECTION_TYPE_SOCKET) {
        const { host, port } = options;
        const line = i18n._('Connected to {{host}}:{{port}}', {
          host: chalk.blueBright(host),
          port: chalk.blueBright(port),
        });
        actions.writeln(chalk.white(line));
      }
    };

    const onConnectionClose = (state) => {
      actions.clear();
    };

    const onConnectionWrite = (state, data, context) => {
      const { source, __sender__ } = { ...context };

      if (__sender__ === sender.current) {
        // Do not write to the terminal console if the sender is the widget itself
        return;
      }

      data = String(data).trim();

      if (source) {
        actions.writeln(chalk.blackBright(source) + chalk.white(prompt + data));
      } else {
        actions.writeln(chalk.white(prompt + data));
      }
    };

    const onConnectionRead = (state, data) => {
      actions.writeln(data);
    };

    controller.addListener('connection:open', onConnectionOpen);
    controller.addListener('connection:close', onConnectionClose);
    controller.addListener('connection:write', onConnectionWrite);
    controller.addListener('connection:read', onConnectionRead);

    return () => {
      controller.removeListener('connection:open', onConnectionOpen);
      controller.removeListener('connection:close', onConnectionClose);
      controller.removeListener('connection:write', onConnectionWrite);
      controller.removeListener('connection:read', onConnectionRead);
    };
  });

  useEffectOnce(() => {
    const onResizeToken = pubsub.subscribe('resize', (msg) => {
      actions.resize();
    });

    return () => {
      pubsub.unsubscribe(onResizeToken);
    };
  });

  useEffect(() => {
    const onClear = () => actions.clear();

    const onClearSelection = () => {
      actions.clearSelection();
    };

    const onRefresh = () => {
      actions.refresh();
    };

    const onSelectAll = () => {
      actions.selectAll();
    };

    emitter.on('terminal:clear', onClear);
    emitter.on('terminal:clearSelection', onClearSelection);
    emitter.on('terminal:refresh', onRefresh);
    emitter.on('terminal:selectAll', onSelectAll);

    return () => {
      emitter.off('terminal:clear', onClear);
      emitter.off('terminal:clearSelection', onClearSelection);
      emitter.off('terminal:refresh', onRefresh);
      emitter.off('terminal:selectAll', onSelectAll);
    };
  }, [actions, emitter]);

  // Run the effect after every render
  useEffect(() => {
    if (prevIsFullscreen !== isFullscreen) {
      actions.resize();
    }
  });

  if (!isConnected) {
    return (
      <div className={styles.noSerialConnection}>
        {i18n._('No serial connection')}
      </div>
    );
  }

  return (
    <Terminal containerRef={containerRef} />
  );
}

export default connect(store => {
  const connectionState = _get(store, 'connection.state');
  const isConnected = (connectionState === CONNECTION_STATE_CONNECTED);

  return {
    isConnected,
  };
})(Console);
