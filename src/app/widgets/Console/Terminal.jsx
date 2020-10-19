import cx from 'classnames';
import color from 'cli-color';
import { ensurePositiveNumber } from 'ensure-type';
import _trimEnd from 'lodash/trimEnd';
import PerfectScrollbar from 'perfect-scrollbar';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { limit } from 'app/lib/normalize-range';
import log from 'app/lib/log';
import History from './History';
import styles from './index.styl';

class TerminalWrapper extends Component {
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

    terminalRef = React.createRef();

    term = null;

    fitAddon = null;

    onKeyHandler = (() => {
      let historyCommand = '';

      return (e) => {
        const { key, domEvent } = e;
        const { onData } = this.props;
        const term = this.term;
        const printable = !domEvent.altKey && !domEvent.altGraphKey && !domEvent.ctrlKey && !domEvent.metaKey;
        // https://github.com/xtermjs/xterm.js/blob/master/src/common/buffer/BufferLine.ts
        const currentLineIndex = term._core.buffer.ybase + term._core.buffer.y;
        const currentBufferLine = term._core.buffer.lines.get(currentLineIndex);
        const bufferX = term._core.buffer.x;
        const bufferY = term._core.buffer.y;
        const nullCell = term._core.buffer.getNullCell();

        const line = _trimEnd(currentBufferLine.translateToString());
        if (!line) {
          return;
        }

        // ArrowDown, PageDown
        if (domEvent.key === 'ArrowDown' || domEvent.key === 'PageDown') {
          historyCommand = this.history.forward() || '';

          for (let index = this.prompt.length; index < currentBufferLine.length; ++index) {
            currentBufferLine.setCell(index, nullCell);
          }

          term.write('\r');
          term.write(this.prompt);
          term.write(historyCommand);
          return;
        }

        // ArrowUp, PageUp
        if (domEvent.key === 'ArrowUp' || domEvent.key === 'PageUp') {
          if (!historyCommand) {
            historyCommand = this.history.current() || '';
          } else if (this.history.index > 0) {
            historyCommand = this.history.back() || '';
          }

          for (let index = this.prompt.length; index < currentBufferLine.length; ++index) {
            currentBufferLine.setCell(index, nullCell);
          }

          term.write('\r');
          term.write(this.prompt);
          term.write(historyCommand);
          return;
        }

        // ArrowLeft
        if (domEvent.key === 'ArrowLeft') {
          if (bufferX > this.prompt.length) {
            term.write(key);
          }
          return;
        }

        // ArrowRight
        if (domEvent.key === 'ArrowRight') {
          const x = line.length - 1;
          if (bufferX <= x) {
            term.write(key);
          }
          return;
        }

        // Backspace
        if (domEvent.key === 'Backspace') {
          // Do not delete the prompt
          if (bufferX <= this.prompt.length) {
            return;
          }

          if (bufferX === 0) {
            return;
          }

          for (let index = bufferX - 1; index < currentBufferLine.length - 1; ++index) {
            const nextSiblingCell = {};
            currentBufferLine.loadCell(index + 1, nextSiblingCell);
            currentBufferLine.setCell(index, nextSiblingCell);
          }
          currentBufferLine.setCell(currentBufferLine.length - 1, nullCell);

          term.write('\b');

          return;
        }

        // Delete
        if (domEvent.key === 'Delete') {
          if (bufferX === 0) {
            return;
          }

          for (let index = bufferX; index < currentBufferLine.length - 1; ++index) {
            const nextSiblingCell = {};
            currentBufferLine.loadCell(index + 1, nextSiblingCell);
            currentBufferLine.setCell(index, nextSiblingCell);
          }
          currentBufferLine.setCell(currentBufferLine.length - 1, nullCell);

          term._core.refresh(bufferY, bufferY);

          return;
        }

        // End
        if (domEvent.key === 'End' || (domEvent.metaKey && domEvent.key === 'ArrowRight')) {
          if (bufferX < line.length) {
            term._core.buffer.x = line.length;
          }
          term._core.refresh(bufferY, bufferY);
          return;
        }

        // Enter
        if (domEvent.key === 'Enter') {
          let command = line.slice(this.prompt.length);
          if (command.length > 0) {
            // Clear history command
            historyCommand = '';

            // Reset the index to the last position of the history array
            this.history.resetIndex();

            // Push the buffer to the history list, not including the [Enter] key
            this.history.push(command);
          }

          command += key;
          log.debug('xterm>', command);

          onData(command);
          term.prompt();
          return;
        }

        // Escape
        if (domEvent.key === 'Escape') {
          for (let index = this.prompt.length; index < currentBufferLine.length; ++index) {
            currentBufferLine.setCell(index, nullCell);
          }
          term.write('\r');
          term.write(this.prompt);
          return;
        }

        // Home
        if (domEvent.key === 'Home' || (domEvent.metaKey && domEvent.key === 'ArrowLeft')) {
          term.write('\r');
          term.write(this.prompt);
          return;
        }

        if (!printable) {
          onData(key);
          return;
        }

        if (bufferX < (term.cols - 1)) {
          term.write(key);
        }
      };
    })();

    onPasteHandler = (event) => {
      // Stop data actually being pasted into div
      event.stopPropagation();
      event.preventDefault();

      const clipboardData = event.clipboardData;
      if (!clipboardData) {
        return;
      }

      const pastedData = clipboardData.getData('text/plain');
      const { onData } = this.props;
      const lines = String(pastedData)
        .replace(/(\r\n|\r|\n)/g, '\n')
        .split('\n')
        .slice(0, 10000); // up to 10K lines

      for (let i = 0; i < lines.length; ++i) {
        const line = lines[i];
        if (typeof onData === 'function') {
          onData(line);
        }
        this.term.write(color.white(line));
        this.term.prompt();
      }
    };

    onResizeHandler = (cols, rows) => {
      log.debug(`Resizing the terminal to ${rows} rows and ${cols} cols`);

      if (this.verticalScrollbar) {
        this.verticalScrollbar.update();
      }
    };

    componentDidMount() {
      const { cursorBlink, scrollback, tabStopWidth } = this.props;
      this.term = new Terminal({
        cursorBlink,
        scrollback,
        tabStopWidth,
      });
      this.fitAddon = new FitAddon();
      this.term.loadAddon(this.fitAddon);
      this.term.prompt = () => {
        this.term.write('\r\n');
        this.term.write(color.white(this.prompt));
      };

      const containerElement = this.terminalRef.current;
      this.term.open(containerElement);

      this.term.onKey(this.onKeyHandler);

      this.term.textarea.onpaste = this.onPasteHandler;

      this.term.onResize(this.onResizeHandler);

      this.term.focus(false);
      this.term.setOption('fontFamily', 'Consolas, Menlo, Monaco, Lucida Console, Liberation Mono, DejaVu Sans Mono, Bitstream Vera Sans Mono, Courier New, monospace, serif');

      const xtermElement = containerElement.querySelector('.xterm');
      xtermElement.style.paddingLeft = '3px';

      const viewportElement = containerElement.querySelector('.xterm-viewport');
      this.verticalScrollbar = new PerfectScrollbar(viewportElement);

      this.resize();
    }

    componentWillUnmount() {
      if (this.verticalScrollbar) {
        this.verticalScrollbar.destroy();
        this.verticalScrollbar = null;
      }

      if (this.term) {
        this.term = null;
      }
      if (this.fitAddon) {
        this.fitAddon = null;
      }
    }

    componentDidUpdate(prevProps) {
      if (this.props.cols !== prevProps.cols || this.props.rows !== prevProps.rows) {
        const { cols, rows } = this.props;
        this.resize(cols, rows);
      }

      if (prevProps.cursorBlink !== this.props.cursorBlink) {
        this.term.setOption('cursorBlink', this.props.cursorBlink);
      }

      if (prevProps.scrollback !== this.props.scrollback) {
        this.term.setOption('scrollback', this.props.scrollback);
      }

      if (prevProps.tabStopWidth !== this.props.tabStopWidth) {
        this.term.setOption('tabStopWidth', this.props.tabStopWidth);
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

    // Unfocus the terminal.
    blur() {
      this.term.blur();
    }

    // Clear the entire buffer, making the prompt line the new first line.
    clear() {
      this.term.clear();
    }

    // Clears the current terminal selection.
    clearSelection() {
      this.term.clearSelection();
    }

    // Focus the terminal.
    focus() {
      this.term.focus();
    }

    // Writes text to the terminal, performing the necessary transformations for pasted text.
    // @param {string} data The text to write to the terminal.
    paste(data) {
      this.term.paste(data);
    }

    // Tells the renderer to refresh terminal content between two rows (inclusive) at the next opportunity.
    // @param {number} start The row to start from (between 0 and this.rows - 1).
    // @param {number} end The row to end at (between start and this.rows - 1).
    refresh(...args) {
      let [start = 0, end = this.term.rows - 1] = args;

      start = limit(ensurePositiveNumber(start), 0, this.term.rows - 1);
      end = limit(ensurePositiveNumber(end), start, this.term.rows - 1);

      this.term.refresh(start, end);
    }

    // Perform a full reset (RIS, aka ‘\x1bc’).
    reset() {
      this.term.reset();
    }

    // Resizes the terminal. It’s best practice to debounce calls to resize, this will help ensure that the pty can respond to the resize event before another one occurs.
    // @param {number} cols
    // @param {number} rows
    resize(cols = this.props.cols, rows = this.props.rows) {
      if (!(this.term && this.term.element)) {
        return;
      }

      this.term.refresh(0, this.term.rows - 1);

      const geometry = this.fitAddon && this.fitAddon.proposeDimensions();
      if (!geometry) {
        return;
      }

      cols = (!cols || cols === 'auto') ? geometry.cols : cols;
      rows = (!rows || rows === 'auto') ? geometry.rows : rows;

      this.term.resize(cols, rows);
    }

    // Scroll the display of the terminal.
    // @param {number} amount The number of lines to scroll down (negative scroll up).
    scrollLines(amount) {
      this.term.scrollLines(amount);
    }

    // Scroll the display of the terminal by a number of pages.
    // @param {number} pageCount The number of pages to scroll (negative scrolls up).
    scrollPages(pageCount) {
      this.term.scrollPages(pageCount);
    }

    // Scrolls the display of the terminal to the bottom.
    scrollToBottom() {
      this.term.scrollToBottom();
    }

    // Scrolls to a line within the buffer.
    // @param {number} line The 0-based line index to scroll to.
    scrollToLine(line) {
      this.term.scrollToLine(line);
    }

    // Scrolls the display of the terminal to the top.
    scrollToTop() {
      this.term.scrollToTop();
    }

    // Selects text within the terminal.
    // @param {number} column The column the selection starts at.
    // @param {number} row The row the selection starts at.
    // @param {number} length The length of the selection.
    select(column, row, length) {
      this.term.select(column, row, length);
    }

    // Selects all text within the terminal.
    selectAll() {
      this.term.selectAll();
    }

    // Selects text in the buffer between 2 lines.
    // @param {number} start The 0-based line index to select from (inclusive).
    // @param {number} end The 0-based line index to select to (inclusive).
    selectLines(start, end) {
      this.term.selectLines(start, end);
    }

    // Write data to the terminal.
    // @param {string|Uint8Array} data The data to write to the terminal. This can either be raw bytes given as Uint8Array from the pty or a string. Raw bytes will always be treated as UTF-8 encoded, string data as UTF-16.
    // @param {function} [callback] Optional callback that fires when the data was processed by the parser.
    write(data, callback) {
      this.term.write(data, callback);
    }

    // Writes data to the terminal, followed by a break line character (\n).
    // @param {string|Uint8Array} data The data to write to the terminal. This can either be raw bytes given as Uint8Array from the pty or a string. Raw bytes will always be treated as UTF-8 encoded, string data as UTF-16.
    // @param {function} [callback] Optional callback that fires when the data was processed by the parser.
    writeln(data, callback) {
      const buffer = this.term._core.buffer;
      const currentLineIndex = buffer.ybase + buffer.y;
      const currentBufferLine = buffer.lines.get(currentLineIndex);
      const nullCell = buffer.getNullCell();
      for (let index = this.prompt.length; index < currentBufferLine.length; ++index) {
        currentBufferLine.setCell(index, nullCell);
      }

      this.term.write('\r');
      this.term.write(data, callback);
      this.term.prompt();
    }

    render() {
      const { className, style } = this.props;

      return (
        <div
          ref={this.terminalRef}
          className={cx(className, styles.terminalContainer)}
          style={style}
        />
      );
    }
}

export default TerminalWrapper;
