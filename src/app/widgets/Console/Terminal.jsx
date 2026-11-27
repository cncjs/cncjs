import cx from 'classnames';
import trimEnd from 'lodash/trimEnd';
import PerfectScrollbar from 'perfect-scrollbar';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import ReactDOM from 'react-dom';
import { Terminal } from 'xterm';
import * as fit from 'xterm/lib/addons/fit/fit';
import chalk from 'app/lib/chalk';
import i18n from 'app/lib/i18n';
import log from 'app/lib/log';
import History from './History';
import styles from './index.styl';
import { fitsOnRow, getInputCapacity, readInputLine, colsKeepingPendingInput } from './input';
import { DEFAULT_FONT_STACK, DEFAULT_FONT_SIZE, DEFAULT_BACKGROUND, DEFAULT_TEXT_COLOR, TERMINAL_COLS_MAX, TERMINAL_COLS_MIN } from './constants';
import { buildTerminalTheme } from './terminal-theme';

Terminal.applyAddon(fit);

class TerminalWrapper extends PureComponent {
    static propTypes = {
      fontSize: PropTypes.number,
      cols: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      rows: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      cursorBlink: PropTypes.bool,
      scrollback: PropTypes.number,
      tabStopWidth: PropTypes.number,
      background: PropTypes.string,
      textColor: PropTypes.string,
      readOnly: PropTypes.bool,
      onData: PropTypes.func
    };

    static defaultProps = {
      fontSize: DEFAULT_FONT_SIZE,
      cols: 'auto',
      rows: 'auto',
      cursorBlink: true,
      scrollback: 1000,
      tabStopWidth: 4,
      background: DEFAULT_BACKGROUND,
      textColor: DEFAULT_TEXT_COLOR,
      readOnly: false,
      onData: () => {}
    };

    prompt = '> ';

    // Matches :global(.xterm-screen) in index.styl, which adds 5px of scrollable width
    canvasOffset = 5;
    history = new History(1000);
    viewportElement = null;
    verticalRail = null;
    horizontalScroller = null;
    verticalScrollbar = null;
    terminalContainer = null;
    term = null;
    resizeObserver = null;
    needsRemeasure = false;
    remeasureScheduled = false;
    remeasureFrame = null;
    deferredResize = false;
    keyBacklog = [];
    drainTimer = null;
    useCursorRowForOutput = false; // when input goes through text field, the last row holds output, otherwise it is empty and shows the cursor

    eventHandler = {
      onResize: () => {
        const { rows, cols } = this.term;
        log.debug(`Resizing the terminal to ${rows} rows and ${cols} cols`);

        if (this.verticalScrollbar) {
          this.verticalScrollbar.update();
          this.syncScrollbarRail();
        }
      },
      handleKey: (() => {
        let historyCommand = '';

        return (key, event) => {
          const { onData } = this.props;
          const term = this.term;
          const line = term.buffer.lines.get(term.buffer.ybase + term.buffer.y);
          const nonPrintableKey = (event.altKey || event.altGraphKey || event.ctrlKey || event.metaKey);

          if (!line) {
            return;
          }

          // Home
          if (event.key === 'Home' || (event.metaKey && event.key === 'ArrowLeft')) {
            term.buffer.x = this.prompt.length;
            return;
          }

          // End
          if (event.key === 'End' || (event.metaKey && event.key === 'ArrowRight')) {
            let x = line.length - 1;
            for (; x > this.prompt.length; --x) {
              const c = line[x][1].trim();
              if (c) {
                break;
              }
            }

            if ((x + 1) < (line.length - 1)) {
              term.buffer.x = (x + 1);
            }

            return;
          }

          // Enter
          if (event.key === 'Enter') {
            const input = readInputLine({
              cells: line,
              isWrapped: line.isWrapped,
              cols: term.cols,
              prompt: this.prompt
            });
            if (!input.ok) {
              // What is on screen is not the complete command that was typed: send nothing
              this.notify(i18n._('Command not sent: it does not fit the terminal width. Rewrite the command or increase Columns in Console Settings.'));
              return;
            }
            let buffer = input.command;

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
            this.applyDeferredResize();
            return;
          }

          // Backspace
          if (event.key === 'Backspace') {
            // Do not delete the prompt
            if (term.buffer.x <= this.prompt.length) {
              return;
            }

            for (let x = term.buffer.x; x < line.length; ++x) {
              line[x - 1] = line[x];
            }
            line[line.length - 1] = [term.eraseAttr(), ' ', 1];
            term.updateRange(term.buffer.y);
            term.refresh(term.buffer.y, term.buffer.y);
            term.write('\b');

            return;
          }

          // Delete
          if (event.key === 'Delete') {
            for (let x = term.buffer.x + 1; x < line.length; ++x) {
              line[x - 1] = line[x];
            }
            line[line.length - 1] = [term.eraseAttr(), ' ', 1, 32];
            term.updateRange(term.buffer.y);
            term.refresh(term.buffer.y, term.buffer.y);

            return;
          }

          // Escape
          if (event.key === 'Escape') {
            term.eraseLine(term.buffer.y);
            term.buffer.x = 0;
            term.write(chalk.white(this.prompt));
            this.applyDeferredResize();
            return;
          }

          // ArrowLeft
          if (event.key === 'ArrowLeft') {
            if (term.buffer.x <= this.prompt.length) {
              return;
            }
            term.buffer.x--;
            return;
          }

          // ArrowRight
          if (event.key === 'ArrowRight') {
            let x = line.length - 1;
            for (; x > 0; --x) {
              const c = line[x][1].trim();
              if (c) {
                break;
              }
            }
            if (term.buffer.x <= x) {
              term.buffer.x++;
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
            this.recall(historyCommand);
            return;
          }

          // ArrowDown
          if (event.key === 'ArrowDown') {
            historyCommand = this.history.forward() || '';
            this.recall(historyCommand);
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

          const inputLength = Math.max(this.pendingInputLength(), term.buffer.x - this.prompt.length);
          if (inputLength + key.length > getInputCapacity(term.cols, this.prompt.length)) {
            return;
          }

          // Make sure the cursor position will not exceed the number of columns
          // Keep the last column free for the cursor
          if (term.buffer.x < term.cols - 1) {
            let x = line.length - 1;
            for (; x > term.buffer.x; --x) {
              line[x] = line[x - 1];
            }
            term.write(chalk.white(key));
          }
        };
      })(),
      // xterm processes term.write() asynchronously, so a key handled before the previous key's write was
      // processed sees a stale cursor and row: the last column can be overrun, and Enter could read an incomplete
      // command. Queue the keys and handle them one at a time, each after xterm has caught up.
      onKey: (key, event) => {
        if (this.props.readOnly) {
          // Commands are entered in the command input field
          return;
        }
        this.keyBacklog.push([key, event]);
        if (!this.drainTimer) {
          this.drainKeys();
        }
      },
      onPaste: (data, event) => {
        if (this.props.readOnly) {
          return;
        }
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

    syncScrollbarRail = () => {
      const scroller = this.horizontalScroller;
      const viewport = this.viewportElement;
      const rail = this.verticalRail;
      if (!scroller || !viewport || !rail) {
        return;
      }

      const canvas = scroller && scroller.querySelector('canvas');
      if (!canvas) {
        return;
      }

      const visibleWidth = scroller.clientWidth;
      const contentWidth = Math.max(canvas.offsetWidth + this.canvasOffset, visibleWidth);

      // The viewport must span the content so the rail has room to move inside its box
      viewport.style.width = `${contentWidth}px`;

      // The rail sits at the viewport's right edge; keep it at the right edge of the visible area
      const offset = Math.min(0, scroller.scrollLeft - (contentWidth - visibleWidth));
      rail.style.transform = `translateX(${offset}px)`;
    };

    isVisible() {
      const el = ReactDOM.findDOMNode(this.terminalContainer);
      return !!el && el.offsetWidth > 0 && el.offsetHeight > 0;
    }

    // xterm measures the cell size from a DOM element, which is 0 while the widget is collapsed
    remeasure() {
      if (!this.term) {
        return;
      }
      const size = this.props.fontSize;
      // xterm ignores setOption with an unchanged value: nudge it to force a re-measure
      this.term.setOption('fontSize', size + 1);
      this.term.setOption('fontSize', size);
      this.needsRemeasure = false;
      this.resize();
      if (this.verticalScrollbar) {
        this.verticalScrollbar.update();
      }
      this.syncScrollbarRail();
    }

    proposeCols() {
      const el = ReactDOM.findDOMNode(this.terminalContainer);
      const dims = this.term && this.term.renderer && this.term.renderer.dimensions;
      if (!el || !dims || !dims.actualCellWidth) {
        return null;
      }
      const style = window.getComputedStyle(el);
      const padding = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
      // clientWidth excludes the borders, unlike the CSS width the fit addon uses; the screen is offset by canvasOffset
      const usable = el.clientWidth - padding - this.canvasOffset;
      return Math.min(TERMINAL_COLS_MAX, Math.max(TERMINAL_COLS_MIN, Math.floor(usable / dims.actualCellWidth)));
    }

    proposeRows() {
      const el = ReactDOM.findDOMNode(this.terminalContainer);
      const dims = this.term && this.term.renderer && this.term.renderer.dimensions;
      if (!el || !dims || !dims.actualCellHeight) {
        return null;
      }
      const bottomSpace = parseFloat(window.getComputedStyle(el).paddingBottom) || 0;
      // clientHeight excludes the borders and the horizontal scrollbar, unlike the CSS height the fit addon
      // uses. The canvas is drawn canvasOffset px lower than its layout box (see index.styl), and the
      // container's bottom padding is kept free.
      const usable = el.clientHeight - bottomSpace - this.canvasOffset;
      return Math.max(1, Math.floor(usable / dims.actualCellHeight));
    }

    // The sizes come from an estimate of the cell size; rounding can leave the canvas a few pixels larger than the
    // container. Measure the real canvas and drop rows/columns until it fits.
    trimToFit({ cols, rows, pendingExtent }) {
      const el = ReactDOM.findDOMNode(this.terminalContainer);
      const canvas = el && el.querySelector('canvas');
      if (!canvas) {
        return;
      }
      const bottomSpace = parseFloat(window.getComputedStyle(el).paddingBottom) || 0;
      const floorCols = Math.max(TERMINAL_COLS_MIN, pendingExtent + 1);
      for (let attempts = 0; attempts < 3; ++attempts) {
        const box = el.getBoundingClientRect();
        const rect = canvas.getBoundingClientRect();
        const overflowX = cols ? rect.right - (box.left + el.clientLeft + el.clientWidth) : 0;
        const overflowY = rows ? rect.bottom - (box.top + el.clientTop + el.clientHeight - bottomSpace) : 0;
        const dropCols = overflowX > 0 && this.term.cols > floorCols;
        const dropRows = overflowY > 0 && this.term.rows > 1;
        if (!dropCols && !dropRows) {
          break;
        }
        this.term.resize(dropCols ? this.term.cols - 1 : this.term.cols, dropRows ? this.term.rows - 1 : this.term.rows);
      }
    }

    // Called after a line was submitted or cancelled. term.write() is asynchronous, so the buffer still shows
    // the old row at this point: say that nothing is pending instead of letting resize() read the buffer.
    applyDeferredResize() {
      if (this.deferredResize) {
        this.deferredResize = false;
        this.resize(undefined, undefined, { assumeEmptyInput: true });
      }
    }

    invertColor(bg) {
        const color = bg.replace('#', '');
        const r = 255 - parseInt(color.substring(0, 2), 16);
        const g = 255 - parseInt(color.substring(2, 4), 16);
        const b = 255 - parseInt(color.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, 0.5)`;
    }

    getTheme(props = this.props) {
      return buildTerminalTheme(props.background, props.textColor);
    }

    applyBackground(color) {
      const el = ReactDOM.findDOMNode(this.terminalContainer);
      if (!el) {
        return;
      }
      const thumbColor = this.invertColor(color);
      el.style.setProperty('--terminal-bg', color);
      el.style.setProperty('--terminal-thumb', thumbColor);
      el.style.backgroundColor = color;
      el.style.borderColor = color;
      ['.xterm', '.xterm-viewport'].forEach(selector => {
        const node = el.querySelector(selector);
        if (node) {
          node.style.backgroundColor = color;
        }
      });
      el.querySelectorAll('.ps__rail-y').forEach(node => {
        node.style.backgroundColor = color;
      });
    }

    componentDidMount() {
      const { cursorBlink, scrollback, tabStopWidth, fontSize } = this.props;
      const theme = this.getTheme();
      this.term = new Terminal({
        cursorBlink,
        scrollback,
        tabStopWidth,
        fontFamily: DEFAULT_FONT_STACK,
        fontSize,
        theme
      });

      this.term.prompt = () => {
        this.term.write('\r\n');
        this.term.write(chalk.white(this.prompt));
      };
      this.term.on('resize', this.eventHandler.onResize);
      this.term.on('key', this.eventHandler.onKey);
      this.term.on('paste', this.eventHandler.onPaste);

      const el = ReactDOM.findDOMNode(this.terminalContainer);
      this.term.open(el);
      this.term.fit();
      if (this.props.readOnly) {
        this.applyReadOnly(true);
      } else {
        this.term.focus(false);
      }

      this.term.setOption('lineHeight', 1.2);
      this.term.setOption('letterSpacing', 1);

      const viewportElement = el.querySelector('.xterm-viewport');
      this.viewportElement = viewportElement;
      // Horizontal scrolling is native (on the container), so PerfectScrollbar must never offer it
      this.verticalScrollbar = new PerfectScrollbar(viewportElement, { suppressScrollX: true });
      this.verticalRail = viewportElement.querySelector('.ps__rail-y');
      this.horizontalScroller = el;
      this.horizontalScroller.addEventListener('scroll', this.syncScrollbarRail, { passive: true });
      this.applyBackground(theme.background);
      this.resize();
      this.syncScrollbarRail();
      this.needsRemeasure = !this.isVisible();
      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => {
          if (!this.needsRemeasure || this.remeasureScheduled) {
            return;
          }
          // Do the work after the callback returns: resizing the observed element inside it is what
          // produces "ResizeObserver loop completed with undelivered notifications"
          this.remeasureScheduled = true;
          this.remeasureFrame = window.requestAnimationFrame(() => {
            this.remeasureScheduled = false;
            this.remeasureFrame = null;
            if (this.needsRemeasure && this.isVisible()) {
              this.remeasure();
            }
          });
        });
        this.resizeObserver.observe(el);
      }
    }

    componentWillUnmount() {
      clearTimeout(this.drainTimer);
      this.drainTimer = null;
      this.keyBacklog = [];
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
      }
      if (this.remeasureFrame) {
        window.cancelAnimationFrame(this.remeasureFrame);
        this.remeasureFrame = null;
      }
      if (this.verticalScrollbar) {
        if (this.horizontalScroller) {
          this.horizontalScroller.removeEventListener('scroll', this.syncScrollbarRail);
          this.horizontalScroller = null;
        }
        this.viewportElement = null;
        this.verticalRail = null;
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
      const sizeChanged = nextProps.fontSize !== this.props.fontSize;
      if (sizeChanged) {
        this.term.setOption('fontSize', nextProps.fontSize);
      }
      if (sizeChanged && !this.isVisible()) {
        // The cell size was measured while hidden (collapsed): re-measure when it is shown again
        this.needsRemeasure = true;
      }
      const colorsChanged = nextProps.background !== this.props.background ||
        nextProps.textColor !== this.props.textColor;
      if (sizeChanged || colorsChanged) {
        // xterm may clear the canvas without redrawing if cell metrics are unchanged.
        const theme = this.getTheme(nextProps);
        this.term.setOption('theme', theme);
        if (colorsChanged) {
          this.applyBackground(theme.background);
        }
      }
    }

    componentDidUpdate(prevProps) {
      if (this.props.readOnly !== prevProps.readOnly) {
        this.applyReadOnly(this.props.readOnly);
      }
      if (this.props.cols !== prevProps.cols || this.props.rows !== prevProps.rows) {
        const { cols, rows } = this.props;
        this.resize(cols, rows);
      }
      if (this.props.fontSize !== prevProps.fontSize) {
        // Cell size changed: recompute the geometry and refresh the scrollbar
        this.resize();
        if (this.verticalScrollbar) {
          this.verticalScrollbar.update();
        }
        this.syncScrollbarRail();
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

    resize(cols = this.props.cols, rows = this.props.rows, { assumeEmptyInput = false } = {}) {
      if (!(this.term && this.term.element)) {
        return;
      }

      const geometry = fit.proposeGeometry(this.term);
      if (!geometry) {
        return;
      }

      const autoCols = !cols || cols === 'auto';
      const autoRows = !rows || rows === 'auto';
      const requestedCols = autoCols ? (this.proposeCols() || geometry.cols) : cols;
      rows = autoRows ? (this.proposeRows() || geometry.rows) : rows;

      // Never shrink below a command that is being typed: it would be hidden. Hold the shrink back until the
      // line is submitted or cancelled (applyDeferredResize).
      const pendingExtent = this.prompt.length + (assumeEmptyInput ? 0 : this.pendingInputLength());
      this.deferredResize = requestedCols < this.term.cols && pendingExtent + 1 > requestedCols;
      this.term.resize(colsKeepingPendingInput(requestedCols, pendingExtent, this.term.cols), rows);

      if (autoCols || autoRows) {
        this.trimToFit({ cols: autoCols, rows: autoRows, pendingExtent });
      }
      this.syncScrollbarRail();
    }

    clear() {
      if (this.props.readOnly) {
        // Queue the clear behind pending output: erase the screen and scrollback, then home the cursor.
        this.term.write('\x1b[2J\x1b[3J\x1b[H');
        this.useCursorRowForOutput = false;
        return;
      }
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
      if (this.props.readOnly) {
        // No prompt row while commands come from the command input field, and no empty row below the output:
        // start each line on a new row instead of ending it with one
        this.term.write(`${this.useCursorRowForOutput ? '\r\n' : '\x1b[2K\r'}${data}`);
        this.useCursorRowForOutput = true;
        return;
      }

      const line = this.term.buffer.lines.get(this.term.buffer.ybase + this.term.buffer.y);
      const cursorX = this.term.buffer.x;
      let input = '';

      if (line) {
        for (let x = this.prompt.length; x < line.length; ++x) {
          input += line[x][1] || '';
        }
        input = trimEnd(input);
      }

      const cursorOffset = Math.min(Math.max(0, cursorX - this.prompt.length), input.length);
      const cursorLeft = input.length - cursorOffset;
      const restoreCursor = cursorLeft > 0 ? `\x1b[${cursorLeft}D` : '';

      this.term.write(`\x1b[2K\r${data}\r\n${chalk.white(this.prompt + input)}${restoreCursor}`);
    }

    // While read-only, commands are entered in the command input field instead of the terminal: the terminal
    // shows output only, without a prompt row or cursor. Keys and pastes are ignored (see onKey and onPaste), and
    // inputmode="none" plus readOnly keep on-screen keyboards from opening when the terminal gets focus.
    applyReadOnly(readOnly) {
      if (!this.term) {
        return;
      }
      const textarea = this.term.textarea;
      if (readOnly) {
        this.keyBacklog = [];
        // Remove the prompt row (and any half-typed command) and hide the cursor
        this.term.setOption('cursorBlink', false);
        this.removePromptRow();
        this.term.write('\x1b[?25l');
        if (textarea) {
          // Neither attribute alone is guaranteed to keep every on-screen keyboard closed
          textarea.setAttribute('inputmode', 'none');
          textarea.readOnly = true;
          if (document.activeElement === textarea) {
            textarea.blur();
          }
        }
      } else {
        // Bring back the cursor and a prompt row below the last output line
        this.term.setOption('cursorBlink', this.props.cursorBlink);
        const newRow = this.useCursorRowForOutput ? '\r\n' : '\x1b[2K\r';
        this.term.write(`\x1b[?25h${newRow}${chalk.white(this.prompt)}`);
        this.useCursorRowForOutput = false;
        if (textarea) {
          textarea.removeAttribute('inputmode');
          textarea.readOnly = false;
        }
      }
    }

    // Read-only: drop the prompt row (and any half-typed command) and put the cursor at the end of the last output
    // line above it, so the next output line and a later prompt row both go where the prompt row was
    removePromptRow() {
      const { term } = this;
      const { buffer } = term;
      const previous = buffer.y > 0 ? buffer.lines.get(buffer.ybase + buffer.y - 1) : null;
      if (!previous) {
        term.write('\x1b[2K\r');
        this.useCursorRowForOutput = false;
        return;
      }
      let end = 0;
      for (let x = previous.length - 1; x >= 0; --x) {
        if ((previous[x][1] || '').trim()) {
          end = x + 1;
          break;
        }
      }
      // Erase the prompt row, move up one row, then to the column after the last character
      term.write(`\x1b[2K\x1b[A\x1b[${end + 1}G`);
      this.useCursorRowForOutput = true;
    }

    // Replace the input row by a notice and start a new prompt; nothing is sent
    notify(message) {
      const { term } = this;
      term.eraseLine(term.buffer.y);
      term.buffer.x = 0;
      term.write(chalk.yellow(message));
      term.prompt();
      this.applyDeferredResize();
    }

    writesPending() {
      const { term } = this;
      return !!term && (!!term.writeInProgress || !!(term.writeBuffer && term.writeBuffer.length));
    }

    drainKeys = () => {
      this.drainTimer = null;
      while (this.keyBacklog.length) {
        if (!this.term) {
          this.keyBacklog = [];
          return;
        }
        if (this.writesPending()) {
          this.drainTimer = setTimeout(this.drainKeys, 1);
          return;
        }
        const [key, event] = this.keyBacklog.shift();
        this.eventHandler.handleKey(key, event);
      }
    };

    recall(command) {
      const { term } = this;
      if (!fitsOnRow(command, term.cols, this.prompt.length)) {
        // Showing it would wrap it, and a wrapped command cannot be sent safely
        this.notify(i18n._('This history entry does not fit the terminal width. Rewrite the command or increase Columns in Console Settings to recall it.'));
        return;
      }
      term.eraseLine(term.buffer.y);
      term.buffer.x = 0;
      term.write(chalk.white(this.prompt));
      term.write(chalk.white(command));
    }

    // Length of the command being typed (0 when the prompt is empty)
    pendingInputLength() {
      if (!this.term) {
        return 0;
      }
      const line = this.term.buffer.lines.get(this.term.buffer.ybase + this.term.buffer.y);
      if (!line) {
        return 0;
      }
      for (let x = line.length - 1; x >= this.prompt.length; --x) {
        if ((line[x][1] || '').trim()) {
          return x + 1 - this.prompt.length;
        }
      }
      return 0;
    }

    hasPendingInput() {
      return this.pendingInputLength() > 0;
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
