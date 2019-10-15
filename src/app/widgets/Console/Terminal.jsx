import cx from 'classnames';
import color from 'cli-color';
import _trimEnd from 'lodash/trimEnd';
import PerfectScrollbar from 'perfect-scrollbar';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
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

    eventHandler = {
        onResize: (cols, rows) => {
            log.debug(`Resizing the terminal to ${rows} rows and ${cols} cols`);

            if (this.verticalScrollbar) {
                this.verticalScrollbar.update();
            }
        },
        onKey: (() => {
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
        })(),

        /* FIXME
        onPaste: (data, event) => {
            const { onData } = this.props;
            const lines = String(data).replace(/(\r\n|\r|\n)/g, '\n').split('\n');
            for (let i = 0; i < lines.length; ++i) {
                const line = lines[i];
                onData(line);
                this.term.write(color.white(line));
                this.term.prompt();
            }
        }
        */
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

        this.term.onResize(this.eventHandler.onResize);
        this.term.onKey(this.eventHandler.onKey);
        //this.term.on('paste', this.eventHandler.onPaste); // FIXME

        const el = this.terminalRef.current;
        this.term.open(el);

        // Make the terminal's size and geometry fit the size of the container element
        this.fitAddon.fit();

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
            /* FIXME
            this.term.off('resize', this.eventHandler.onResize);
            this.term.off('key', this.eventHandler.onKey);
            this.term.off('paste', this.eventHandler.onPaste);
            */
            this.term = null;
        }
        if (this.fitAddon) {
            this.fitAddon = null;
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

        const geometry = this.fitAddon && this.fitAddon.proposeDimensions();
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
        const term = this.term;
        const currentLineIndex = term._core.buffer.ybase + term._core.buffer.y;
        const currentBufferLine = term._core.buffer.lines.get(currentLineIndex);
        const nullCell = term._core.buffer.getNullCell();
        for (let index = this.prompt.length; index < currentBufferLine.length; ++index) {
            currentBufferLine.setCell(index, nullCell);
        }

        term.write('\r');
        term.write(data);
        term.prompt();
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
