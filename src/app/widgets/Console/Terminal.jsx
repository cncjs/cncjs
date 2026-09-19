import cx from 'classnames';
import trimEnd from 'lodash/trimEnd';
import PerfectScrollbar from 'perfect-scrollbar';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import { Terminal } from 'xterm';
import * as fit from 'xterm/lib/addons/fit/fit';
import chalk from 'app/lib/chalk';
import log from 'app/lib/log';
import History from './History';
import styles from './index.styl';

Terminal.applyAddon(fit);

// Erase the whole line and return the cursor to column 0.
//
// xterm dropped `Terminal.eraseLine()` after 3.0; this sequence is what the
// widget already used for the same job when writing incoming data, so the
// three call sites that lost the method now go through the same path rather
// than a second mechanism.
const ERASE_LINE = '\x1b[2K\r';

class TerminalWrapper extends PureComponent {
    static propTypes = {
      cols: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      rows: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      cursorBlink: PropTypes.bool,
      scrollback: PropTypes.number,
      tabStopWidth: PropTypes.number,
      onData: PropTypes.func
    };

    static defaultProps = {
      cols: 'auto',
      rows: 'auto',
      cursorBlink: true,
      scrollback: 1000,
      tabStopWidth: 4,
      onData: () => {}
    };

    prompt = '> ';

    history = new History(1000);

    verticalScrollbar = null;

    terminalContainer = null;

    term = null;

    /**
     * xterm's own Terminal, behind the public wrapper.
     *
     * From 3.1 the package entry point is a thin facade that forwards a
     * documented surface to the real terminal and exposes nothing else. The
     * line editor below needs `buffer`, `eraseAttr()` and `updateRange()`,
     * none of which are on that facade — so reaching them means going through
     * `_core`, as the addons shipped with xterm itself do.
     *
     * This is private API and the widget has always depended on private API;
     * what changed at 3.1 is only where it lives. The hardware tier is what
     * says whether it still works.
     */
    get core() {
      return this.term && this.term._core;
    }

    eventHandler = {
      onResize: () => {
        const { rows, cols } = this.term;
        log.debug(`Resizing the terminal to ${rows} rows and ${cols} cols`);

        if (this.verticalScrollbar) {
          this.verticalScrollbar.update();
        }
      },
      onKey: (() => {
        let historyCommand = '';

        return (key, event) => {
          const { onData } = this.props;
          const term = this.term;
          const core = this.core;
          const line = core.buffer.lines.get(core.buffer.ybase + core.buffer.y);
          const nonPrintableKey = (event.altKey || event.altGraphKey || event.ctrlKey || event.metaKey);

          if (!line) {
            return;
          }

          // Home
          if (event.key === 'Home' || (event.metaKey && event.key === 'ArrowLeft')) {
            core.buffer.x = this.prompt.length;
            return;
          }

          // End
          if (event.key === 'End' || (event.metaKey && event.key === 'ArrowRight')) {
            let x = line.length - 1;
            for (; x > this.prompt.length; --x) {
              const c = line.get(x)[1].trim();
              if (c) {
                break;
              }
            }

            if ((x + 1) < (line.length - 1)) {
              core.buffer.x = (x + 1);
            }

            return;
          }

          // Enter
          if (event.key === 'Enter') {
            let buffer = '';
            for (let x = this.prompt.length; x < line.length; ++x) {
              const c = line.get(x)[1] || '';
              buffer += c;
            }
            buffer = trimEnd(buffer);

            if (buffer.length > 0) {
              // Clear history command
              historyCommand = '';

              // Reset the index to the last position of the history array
              this.history.resetIndex();

              // Push the buffer to the history list, not including the [Enter] key
              this.history.push(buffer);
            }

            buffer += key;

            log.debug('xterm>', buffer);

            onData(buffer);
            term.prompt();
            return;
          }

          // Backspace
          if (event.key === 'Backspace') {
            // Do not delete the prompt
            if (core.buffer.x <= this.prompt.length) {
              return;
            }

            for (let x = core.buffer.x; x < line.length; ++x) {
              line.set(x - 1, line.get(x));
            }
            line.set(line.length - 1, [core.eraseAttr(), ' ', 1, 32]);
            core.updateRange(core.buffer.y);
            term.refresh(core.buffer.y, core.buffer.y);
            term.write('\b');

            return;
          }

          // Delete
          if (event.key === 'Delete') {
            for (let x = core.buffer.x + 1; x < line.length; ++x) {
              line.set(x - 1, line.get(x));
            }
            line.set(line.length - 1, [core.eraseAttr(), ' ', 1, 32]);
            core.updateRange(core.buffer.y);
            term.refresh(core.buffer.y, core.buffer.y);

            return;
          }

          // Escape
          if (event.key === 'Escape') {
            term.write(`${ERASE_LINE}${chalk.white(this.prompt)}`);
            return;
          }

          // ArrowLeft
          if (event.key === 'ArrowLeft') {
            if (core.buffer.x <= this.prompt.length) {
              return;
            }
            core.buffer.x--;
            return;
          }

          // ArrowRight
          if (event.key === 'ArrowRight') {
            let x = line.length - 1;
            for (; x > 0; --x) {
              const c = line.get(x)[1].trim();
              if (c) {
                break;
              }
            }
            if (core.buffer.x <= x) {
              core.buffer.x++;
            }

            return;
          }

          // ArrowUp
          if (event.key === 'ArrowUp') {
            if (!historyCommand) {
              historyCommand = this.history.current() || '';
            } else if (this.history.index > 0) {
              historyCommand = this.history.back() || '';
            }
            term.write(`${ERASE_LINE}${chalk.white(this.prompt)}${chalk.white(historyCommand)}`);
            return;
          }

          // ArrowDown
          if (event.key === 'ArrowDown') {
            historyCommand = this.history.forward() || '';
            term.write(`${ERASE_LINE}${chalk.white(this.prompt)}${chalk.white(historyCommand)}`);
            return;
          }

          // PageUp
          if (event.key === 'PageUp') {
            // Unsupported
            return;
          }

          // PageDown
          if (event.key === 'PageDown') {
            // Unsupported
            return;
          }

          // Non-printable keys (e.g. ctrl-x)
          if (nonPrintableKey) {
            onData(key);
            return;
          }

          // Make sure the cursor position will not exceed the number of columns
          if (core.buffer.x < term.cols) {
            let x = line.length - 1;
            for (; x > core.buffer.x; --x) {
              line.set(x, line.get(x - 1));
            }
            term.write(chalk.white(key));
          }
        };
      })(),
      onPaste: (data, event) => {
        const { onData } = this.props;
        const lines = String(data).replace(/(\r\n|\r|\n)/g, '\n').split('\n');
        for (let i = 0; i < lines.length; ++i) {
          const line = lines[i].trim();
          if (line.length) {
            onData(line + '\n');
            this.term.write(chalk.white(line));
            this.term.prompt();
          }
        }
      }
    };

    componentDidMount() {
      const { cursorBlink, scrollback, tabStopWidth } = this.props;
      this.term = new Terminal({
        cursorBlink,
        scrollback,
        tabStopWidth
      });
      this.term.prompt = () => {
        this.term.write('\r\n');
        this.term.write(chalk.white(this.prompt));
      };
      this.term.on('resize', this.eventHandler.onResize);
      this.term.on('key', this.eventHandler.onKey);
      this.term.on('paste', this.eventHandler.onPaste);

      const el = this.terminalContainer;
      this.term.open(el);
      this.term.fit();
      this.term.focus(false);

      this.term.setOption('fontFamily', 'Consolas, Menlo, Monaco, Lucida Console, Liberation Mono, DejaVu Sans Mono, Bitstream Vera Sans Mono, Courier New, monospace, serif');
      const xtermElement = el.querySelector('.xterm');
      xtermElement.style.paddingLeft = '3px';

      const viewportElement = el.querySelector('.xterm-viewport');
      this.verticalScrollbar = new PerfectScrollbar(viewportElement);

      this.resize();
    }

    componentWillUnmount() {
      if (this.verticalScrollbar) {
        this.verticalScrollbar.destroy();
        this.verticalScrollbar = null;
      }
      if (this.term) {
        this.term.off('resize', this.eventHandler.onResize);
        this.term.off('key', this.eventHandler.onKey);
        this.term.off('paste', this.eventHandler.onPaste);
        this.term = null;
      }
    }

    componentWillReceiveProps(nextProps) {
      if (nextProps.cursorBlink !== this.props.cursorBlink) {
        this.term.setOption('cursorBlink', nextProps.cursorBlink);
      }
      if (nextProps.scrollback !== this.props.scrollback) {
        this.term.setOption('scrollback', nextProps.scrollback);
      }
      if (nextProps.tabStopWidth !== this.props.tabStopWidth) {
        this.term.setOption('tabStopWidth', nextProps.tabStopWidth);
      }
    }

    componentDidUpdate(prevProps) {
      if (this.props.cols !== prevProps.cols || this.props.rows !== prevProps.rows) {
        const { cols, rows } = this.props;
        this.resize(cols, rows);
      }
    }

    // http://www.alexandre-gomes.com/?p=115
    getScrollbarWidth() {
      const inner = document.createElement('p');
      inner.style.width = '100%';
      inner.style.height = '200px';

      const outer = document.createElement('div');
      outer.style.position = 'absolute';
      outer.style.top = '0px';
      outer.style.left = '0px';
      outer.style.visibility = 'hidden';
      outer.style.width = '200px';
      outer.style.height = '150px';
      outer.style.overflow = 'hidden';
      outer.appendChild(inner);

      document.body.appendChild(outer);
      const w1 = inner.offsetWidth;
      outer.style.overflow = 'scroll';
      const w2 = (w1 === inner.offsetWidth) ? outer.clientWidth : inner.offsetWidth;
      document.body.removeChild(outer);

      return (w1 - w2);
    }

    resize(cols = this.props.cols, rows = this.props.rows) {
      if (!(this.term && this.term.element)) {
        return;
      }

      const geometry = fit.proposeGeometry(this.term);
      if (!geometry) {
        return;
      }

      cols = (!cols || cols === 'auto') ? geometry.cols : cols;
      rows = (!rows || rows === 'auto') ? geometry.rows : rows;
      this.term.resize(cols, rows);
    }

    clear() {
      this.term.clear();
    }

    selectAll() {
      this.term.selectAll();
    }

    clearSelection() {
      this.term.clearSelection();
    }

    write(data) {
      this.term.write(data);
    }

    writeln(data) {
      const line = this.core.buffer.lines.get(this.core.buffer.ybase + this.core.buffer.y);
      const cursorX = this.core.buffer.x;
      let input = '';

      if (line) {
        for (let x = this.prompt.length; x < line.length; ++x) {
          input += line.get(x)[1] || '';
        }
        input = trimEnd(input);
      }

      const cursorOffset = Math.min(Math.max(0, cursorX - this.prompt.length), input.length);
      const cursorLeft = input.length - cursorOffset;
      const restoreCursor = cursorLeft > 0 ? `\x1b[${cursorLeft}D` : '';

      this.term.write(`${ERASE_LINE}${data}\r\n${chalk.white(this.prompt + input)}${restoreCursor}`);
    }

    render() {
      const { className, style } = this.props;

      return (
        <div
          role="log"
          aria-live="polite"
          aria-label="Console output"
          ref={node => {
            this.terminalContainer = node;
          }}
          className={cx(className, styles.terminalContainer)}
          style={style}
        />
      );
    }
}

export default TerminalWrapper;
