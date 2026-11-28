import cx from 'classnames';
import PropTypes from 'prop-types';
import pubsub from 'pubsub-js';
import React, { PureComponent } from 'react';
import uuid from 'uuid';
import settings from 'app/config/settings';
import Space from 'app/components/Space';
import Widget from 'app/components/Widget';
import chalk from 'app/lib/chalk';
import controller from 'app/lib/controller';
import i18n from 'app/lib/i18n';
import portal from 'app/lib/portal';
import WidgetConfig from '../WidgetConfig';
import Console from './Console';
import styles from './index.styl';
import Settings from './Settings';
import { DEFAULT_BACKGROUND, DEFAULT_TEXT_COLOR, DEFAULT_FONT_SIZE, FONT_SIZES, TERMINAL_COLS, TERMINAL_COLS_MAX, TERMINAL_COLS_MIN, TERMINAL_ROWS, TERMINAL_ROWS_MAX, TERMINAL_ROWS_MIN } from './constants';

const clamp = (value, min, max, fallback) => {
  const n = Number(value);
  return Number.isInteger(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

// A line that gets no reply within this time (e.g. lost on the way) is forgotten
const REPLY_TIMEOUT = 5000;
const REPLY_QUEUE_MAX = 256;

class ConsoleWidget extends PureComponent {
    static propTypes = {
      widgetId: PropTypes.string.isRequired,
      onFork: PropTypes.func.isRequired,
      onRemove: PropTypes.func.isRequired,
      sortable: PropTypes.object
    };

    senderId = uuid.v4();

    // Public methods
    collapse = () => {
      this.setState({ minimized: true });
    };

    expand = () => {
      this.setState({ minimized: false });
    };

    config = new WidgetConfig(this.props.widgetId);

    state = this.getInitialState();

    actions = {
      toggleFullscreen: () => {
        this.setState(state => ({
          minimized: state.isFullscreen ? state.minimized : false,
          isFullscreen: !state.isFullscreen,
          terminal: {
            ...state.terminal,
            cols: state.isFullscreen ? this.getConfiguredCols() : 'auto',
            rows: state.isFullscreen ? this.getConfiguredRows() : 'auto',
          }
        }), () => {
          this.resizeTerminal();
        });
      },
      toggleMinimized: () => {
        this.setState(state => ({
          minimized: !state.minimized
        }), () => {
          this.resizeTerminal();
        });
      },
      clearAll: () => {
        this.terminal && this.terminal.clear();
      },
      toggleCommandInput: () => {
        const commandInput = !this.state.commandInput;
        // Saved locally per device, like the other Console settings
        this.config.set('commandInput', commandInput);
        this.setState({ commandInput }, () => {
          // The field changes the space left for the terminal
          this.resizeTerminal();
        });
      },
      // Commands from the command input field. Echo them first: commands from this widget are not written to the
      // terminal by the 'serialport:write' handler.
      sendCommand: (command) => {
        if (this.terminal) {
          this.terminal.writeln(chalk.white(this.terminal.prompt + command));
        }
        this.actions.onTerminalData(command + '\n');
      },
      onTerminalData: (data) => {
        const context = {
          __sender__: this.senderId
        };
        controller.write(data, context);
      },
      saveSettings: ({ fontSize, cols, rows, background, textColor }) => {
        // A narrower terminal could hide or wrap what is being typed: wait until the input is resolved
        if (!this.state.isFullscreen && cols !== this.getConfiguredCols() && this.terminal && this.terminal.hasPendingInput()) {
          return i18n._('Finish or clear the command you are typing before changing the number of columns.');
        }

        // Persisted here, not in componentDidUpdate: defaults must stay distinguishable from explicit choices,
        // and while fullscreen the state holds rows = 'auto'
        this.config.set('terminalCols', cols);
        this.config.set('terminalRows', rows);
        this.config.set('fontSize', fontSize);
        this.config.set('terminalBackground', background);
        this.config.set('terminalTextColor', textColor);
        this.setState(state => ({
          terminal: {
            ...state.terminal,
            fontSize,
            cols: state.isFullscreen ? 'auto' : cols,
            rows: state.isFullscreen ? 'auto' : rows,
            background,
            textColor
          }
        }));
        return null;
      },
      openSettings: () => {
        const { terminal } = this.state;
        portal(({ onClose }) => (
          <Settings
            fontSize={terminal.fontSize}
            cols={this.getConfiguredCols()}
            rows={this.getConfiguredRows()}
            background={terminal.background}
            textColor={terminal.textColor}
            onSave={(data) => {
              const error = this.actions.saveSettings(data);
              if (!error) {
                onClose();
              }
              return error;
            }}
            onCancel={onClose}
          />
        ));
      },
    };

    // The controller answers every line it is sent, in the order it received them. For each line written to it
    // remember whether it was sent with echo: false, so its `ok` can be left out of the Console as well.
    replyQueue = [];

    queueReplies(data, hidden) {
      const now = Date.now();
      const lines = (String(data).match(/\n/g) || []).length; // realtime commands (?, !, ~) have no newline and no reply
      for (let i = 0; i < lines; ++i) {
        this.replyQueue.push({ hidden, time: now });
      }
      this.replyQueue = this.replyQueue.slice(-REPLY_QUEUE_MAX);
    }

    // Returns true if `line` is the `ok` of a command that was sent with echo: false (`ok` alone, or followed by
    // text as Marlin does, e.g. `ok T:25.0 /0.0`). Errors are always shown.
    takeReply(line) {
      const now = Date.now();
      while (this.replyQueue.length > 0 && now - this.replyQueue[0].time > REPLY_TIMEOUT) {
        this.replyQueue.shift();
      }
      const isOk = /^ok\b/i.test(line);
      if (!isOk && !/^error:/i.test(line)) {
        return false;
      }
      const reply = this.replyQueue.shift();
      return !!reply && reply.hidden && isOk;
    }

    controllerEvents = {
      'serialport:open': (options) => {
        const { port, baudrate } = options;
        this.replyQueue = [];
        this.setState({ port: port });

        if (this.terminal) {
          const { productName, version } = settings;
          this.terminal.writeln(chalk.white.bold(`${productName} ${version} [${controller.type}]`));
          this.terminal.writeln(chalk.white(i18n._('Connected to {{-port}} with a baud rate of {{baudrate}}', { port: chalk.yellowBright(port), baudrate: chalk.blueBright(baudrate) })));
        }
      },
      'serialport:close': (options) => {
        this.replyQueue = [];
        this.actions.clearAll();

        const initialState = this.getInitialState();
        this.setState({ ...initialState });
      },
      'serialport:write': (data, context) => {
        const { source, __sender__, echo } = { ...context };

        if (String(data).includes('\x18')) {
          this.replyQueue = []; // soft reset: the controller drops the lines it had not answered
        }
        this.queueReplies(data, echo === false);

        if (__sender__ === this.senderId) {
          // Do not write to the terminal console if the sender is the widget itself
          return;
        }

        if (echo === false) {
          // The sender asked not to be echoed (e.g. a pendant bridge sending many small jogs)
          return;
        }

        if (!this.terminal) {
          return;
        }

        data = String(data).trim();

        if (source) {
          this.terminal.writeln(chalk.blackBright(source) + chalk.white(this.terminal.prompt + data));
        } else {
          this.terminal.writeln(chalk.white(this.terminal.prompt + data));
        }
      },
      'serialport:read': (data) => {
        const line = String(data).trim();

        if (/^Grbl\s/i.test(line)) {
          this.replyQueue = []; // startup banner: nothing is outstanding after a reset
        }
        if (this.takeReply(line)) {
          return; // the reply to a command that was not echoed
        }

        if (!this.terminal) {
          return;
        }

        this.terminal.writeln(data);
      }
    };

    terminal = null;

    pubsubTokens = [];

    componentDidMount() {
      this.addControllerEvents();
      this.subscribe();
    }

    componentWillUnmount() {
      this.removeControllerEvents();
      this.unsubscribe();
    }

    componentDidUpdate(prevProps, prevState) {
      const { minimized } = this.state;

      this.config.set('minimized', minimized);
    }

    getInitialState() {
      const fontSize = this.config.get('fontSize');
      return {
        minimized: this.config.get('minimized', false),
        isFullscreen: false,
        port: controller.port,
        commandInput: !!this.config.get('commandInput', false),

        // Terminal
        terminal: {
          fontSize: FONT_SIZES.includes(fontSize) ? fontSize : DEFAULT_FONT_SIZE,
          cols: this.getConfiguredCols(),
          rows: this.getConfiguredRows(),
          cursorBlink: true,
          scrollback: 1000,
          tabStopWidth: 4,
          background: this.config.get('terminalBackground', DEFAULT_BACKGROUND),
          textColor: this.config.get('terminalTextColor', DEFAULT_TEXT_COLOR)
        }
      };
    }

    getConfiguredCols() {
      return clamp(this.config.get('terminalCols', TERMINAL_COLS), TERMINAL_COLS_MIN, TERMINAL_COLS_MAX, TERMINAL_COLS);
    }

    getConfiguredRows() {
      return clamp(this.config.get('terminalRows', TERMINAL_ROWS), TERMINAL_ROWS_MIN, TERMINAL_ROWS_MAX, TERMINAL_ROWS);
    }

    subscribe() {
      const tokens = [
        pubsub.subscribe('resize', (msg) => {
          this.resizeTerminal();
        })
      ];
      this.pubsubTokens = this.pubsubTokens.concat(tokens);
    }

    unsubscribe() {
      this.pubsubTokens.forEach((token) => {
        pubsub.unsubscribe(token);
      });
      this.pubsubTokens = [];
    }

    addControllerEvents() {
      Object.keys(this.controllerEvents).forEach(eventName => {
        const callback = this.controllerEvents[eventName];
        controller.addListener(eventName, callback);
      });
    }

    removeControllerEvents() {
      Object.keys(this.controllerEvents).forEach(eventName => {
        const callback = this.controllerEvents[eventName];
        controller.removeListener(eventName, callback);
      });
    }

    resizeTerminal() {
      this.terminal && this.terminal.resize();
    }

    render() {
      const { widgetId } = this.props;
      const { minimized, isFullscreen, commandInput } = this.state;
      const isForkedWidget = widgetId.match(/\w+:[\w\-]+/);
      const state = {
        ...this.state
      };
      const actions = {
        ...this.actions
      };

      return (
        <Widget aria-label="Console widget" fullscreen={isFullscreen}>
          <Widget.Header>
            <Widget.Title>
              <Widget.Sortable className={this.props.sortable.handleClassName}>
                <i aria-hidden="true" className="fa fa-bars" />
                <Space width="8" />
              </Widget.Sortable>
              {isForkedWidget &&
                <i aria-hidden="true" className="fa fa-code-fork" style={{ marginRight: 5 }} />}
              {i18n._('Console')}
            </Widget.Title>
            <Widget.Controls className={this.props.sortable.filterClassName}>
              <Widget.Button
                aria-label={commandInput ? i18n._('Hide command input') : i18n._('Show command input')}
                aria-pressed={commandInput}
                title={commandInput ? i18n._('Hide command input') : i18n._('Show command input')}
                inverted={commandInput}
                onClick={actions.toggleCommandInput}
              >
                <i aria-hidden="true" className="fa fa-keyboard-o" />
              </Widget.Button>
              <Widget.Button
                aria-label="Clear console"
                title={i18n._('Clear all')}
                onClick={actions.clearAll}
              >
                <i aria-hidden="true" className="fa fa-eraser" />
              </Widget.Button>
              <Widget.Button
                aria-label={minimized ? 'Expand' : 'Collapse'}
                aria-expanded={!minimized}
                disabled={isFullscreen}
                title={minimized ? i18n._('Expand') : i18n._('Collapse')}
                onClick={actions.toggleMinimized}
              >
                <i
                  aria-hidden="true"
                  className={cx(
                    'fa',
                    { 'fa-chevron-up': !minimized },
                    { 'fa-chevron-down': minimized }
                  )}
                />
              </Widget.Button>
              <Widget.Button
                aria-label={!isFullscreen ? 'Enter full screen' : 'Exit full screen'}
                title={!isFullscreen ? i18n._('Enter Full Screen') : i18n._('Exit Full Screen')}
                onClick={actions.toggleFullscreen}
              >
                <i
                  aria-hidden="true"
                  className={cx(
                    'fa',
                    { 'fa-expand': !isFullscreen },
                    { 'fa-compress': isFullscreen }
                  )}
                />
              </Widget.Button>
              <Widget.DropdownButton
                aria-label="More options"
                title={i18n._('More')}
                toggle={<i aria-hidden="true" className="fa fa-ellipsis-v" />}
                onSelect={(eventKey) => {
                  if (eventKey === 'settings') {
                    actions.openSettings();
                  } else if (eventKey === 'selectAll') {
                    this.terminal.selectAll();
                  } else if (eventKey === 'clearSelection') {
                    this.terminal.clearSelection();
                  } if (eventKey === 'fork') {
                    this.props.onFork();
                  } else if (eventKey === 'remove') {
                    this.props.onRemove();
                  }
                }}
              >
                <Widget.DropdownMenuItem eventKey="settings">
                  <i aria-hidden="true" className="fa fa-fw fa-cog" />
                  <Space width="4" />
                  {i18n._('Console Settings')}
                </Widget.DropdownMenuItem>
                <Widget.DropdownMenuItem eventKey="selectAll">
                  <i
                    aria-hidden="true"
                    className={cx(
                      styles.icon,
                      styles.selectAll
                    )}
                  />
                  <Space width="4" />
                  {i18n._('Select All')}
                </Widget.DropdownMenuItem>
                <Widget.DropdownMenuItem eventKey="clearSelection">
                  <i aria-hidden="true" className="fa fa-fw fa-window-close-o" />
                  <Space width="4" />
                  {i18n._('Clear Selection')}
                </Widget.DropdownMenuItem>
                <Widget.DropdownMenuItem eventKey="fork">
                  <i aria-hidden="true" className="fa fa-fw fa-code-fork" />
                  <Space width="4" />
                  {i18n._('Fork Widget')}
                </Widget.DropdownMenuItem>
                <Widget.DropdownMenuItem eventKey="remove">
                  <i aria-hidden="true" className="fa fa-fw fa-times" />
                  <Space width="4" />
                  {i18n._('Remove Widget')}
                </Widget.DropdownMenuItem>
              </Widget.DropdownButton>
            </Widget.Controls>
          </Widget.Header>
          <Widget.Content
            aria-hidden={minimized}
            className={cx(
              styles.widgetContent,
              { [styles.hidden]: minimized },
              { [styles.fullscreen]: isFullscreen }
            )}
          >
            <Console
              ref={node => {
                if (node) {
                  this.terminal = node.terminal;
                }
              }}
              state={state}
              actions={actions}
            />
          </Widget.Content>
        </Widget>
      );
    }
}

export default ConsoleWidget;
