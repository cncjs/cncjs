import cx from 'classnames';
import trimEnd from 'lodash/trimEnd';
import PerfectScrollbar from 'perfect-scrollbar';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import ReactDOM from 'react-dom';
import { Terminal } from 'xterm';
import * as fit from 'xterm/lib/addons/fit/fit';
import chalk from 'app/lib/chalk';
import log from 'app/lib/log';
import History from './History';
import styles from './index.styl';
import { DEFAULT_FONT_SIZE, FONT_SIZE_PX, DEFAULT_BACKGROUND, DEFAULT_CURSOR_COLOR, DEFAULT_TEXT_COLOR } from './constants';
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
      cursorColor: PropTypes.string,
      onData: PropTypes.func
    };

    static defaultProps = {
      fontSize: FONT_SIZE_PX[DEFAULT_FONT_SIZE],
      cols: 'auto',
      rows: 'auto',
      cursorBlink: true,
      scrollback: 1000,
      tabStopWidth: 4,
      background: DEFAULT_BACKGROUND,
      textColor: DEFAULT_TEXT_COLOR,
      cursorColor: DEFAULT_CURSOR_COLOR,
      onData: () => {}
    };

    prompt = '> ';

    // Matches "canvas { transform: translate(5px, 5px) }" in index.styl, which adds 5px of scrollable width
    canvasOffset = 5;
    history = new History(1000);
    viewportElement = null;
    verticalRail = null;
    horizontalScroller = null;
    verticalScrollbar = null;
    terminalContainer = null;
    term = null;

    eventHandler = {
      onResize: () => {
        const { rows, cols } = this.term;
        log.debug(`Resizing the terminal to ${rows} rows and ${cols} cols`);

        if (this.verticalScrollbar) {
          this.verticalScrollbar.update();
          this.syncScrollbarRail();
        }
      },
      onKey: (() => {
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
            let buffer = '';
            for (let x = this.prompt.length; x < line.length; ++x) {
              const c = line[x][1] || '';
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
            term.eraseLine(term.buffer.y);
            term.buffer.x = 0;
            term.write(chalk.white(this.prompt));
            term.write(chalk.white(historyCommand));
            return;
          }

          // ArrowDown
          if (event.key === 'ArrowDown') {
            historyCommand = this.history.forward() || '';
            term.eraseLine(term.buffer.y);
            term.buffer.x = 0;
            term.write(chalk.white(this.prompt));
            term.write(chalk.white(historyCommand));
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
          if (term.buffer.x < term.cols) {
            let x = line.length - 1;
            for (; x > term.buffer.x; --x) {
              line[x] = line[x - 1];
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

    invertColor(bg) {
        const color = bg.replace('#', '');
        const r = 255 - parseInt(color.substring(0, 2), 16);
        const g = 255 - parseInt(color.substring(2, 4), 16);
        const b = 255 - parseInt(color.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, 0.5)`;
    }

    getTheme(props = this.props) {
      return buildTerminalTheme(props.background, props.textColor, props.cursorColor);
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
      this.term.focus(false);

      this.term.setOption('fontFamily', 'Consolas, Menlo, Monaco, Lucida Console, Liberation Mono, DejaVu Sans Mono, Bitstream Vera Sans Mono, Courier New, monospace, serif');
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
    }

    componentWillUnmount() {
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
      if (nextProps.fontSize !== this.props.fontSize) {
        this.term.setOption('fontSize', nextProps.fontSize);
      }
      if (nextProps.background !== this.props.background ||
          nextProps.textColor !== this.props.textColor ||
          nextProps.cursorColor !== this.props.cursorColor) {
        const theme = this.getTheme(nextProps);
        this.term.setOption('theme', theme);
        this.applyBackground(theme.background);
      }
    }

    componentDidUpdate(prevProps) {
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
      this.syncScrollbarRail();
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
