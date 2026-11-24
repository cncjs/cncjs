import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import i18n from 'app/lib/i18n';
import CommandInput from './CommandInput';
import Terminal from './Terminal';
import styles from './index.styl';

class Console extends PureComponent {
    static propTypes = {
      state: PropTypes.object,
      actions: PropTypes.object
    };

    terminal = null;

    render() {
      const { state, actions } = this.props;
      const { port } = state;

      if (!port) {
        return (
          <div className={styles.noSerialConnection}>
            {i18n._('No serial connection')}
          </div>
        );
      }

      return (
        <div className={styles.console}>
          <Terminal
            ref={node => {
              if (node) {
                this.terminal = node;
              }
            }}
            fontSize={state.terminal.fontSize}
            cols={state.terminal.cols}
            rows={state.terminal.rows}
            cursorBlink={state.terminal.cursorBlink}
            scrollback={state.terminal.scrollback}
            tabStopWidth={state.terminal.tabStopWidth}
            background={state.terminal.background}
            textColor={state.terminal.textColor}
            readOnly={state.commandInput}
            onData={actions.onTerminalData}
          />
          {state.commandInput &&
            <CommandInput onSend={actions.sendCommand} />}
        </div>
      );
    }
}

export default Console;
