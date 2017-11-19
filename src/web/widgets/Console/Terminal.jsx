import includes from 'lodash/includes';
import classNames from 'classnames';
//import { code } from 'keycode';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import ReactDOM from 'react-dom';
import Xterm from 'xterm';
import fit from 'xterm/lib/addons/fit/fit';
import History from './History';
import log from '../../lib/log';
import styles from './index.styl';

class Terminal extends PureComponent {
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
    history = new History(1000);

    eventHandler = {
        onResize: (size) => {
            const { rows, cols } = { ...size };
            log.debug(`Resizing the terminal to ${rows} rows and ${cols} cols`);
        },
        onKey: (() => {
            let buffer = '';
            let historyCommand = '';

            return (key, event) => {
                const { onData } = this.props;
                const term = this.term;
                const nonPrintableKey = (event.altKey || event.altGraphKey || event.ctrlKey || event.metaKey);

                // Enter
                if (event.key === 'Enter') {
                    if (buffer.length > 0) {
                        // Clear history command
                        historyCommand = '';

                        // Reset the index to the last position of the history array
                        this.history.resetIndex();

                        // Push the buffer to the history list, not including the [Enter] key
                        this.history.push(buffer);
                    }
                    buffer += key;
                    onData(buffer);
                    buffer = '';
                    term.writeln('');
                    return;
                }

                // Backspace
                if (event.key === 'Backspace') {
                    let line = term.buffer.lines.get(term.buffer.ybase + term.buffer.y);
                    let x = term.buffer.x;
                    if (line && x > 0) {
                        for (; x < term.cols; ++x) {
                            line[x - 1] = line[x];
                        }
                        line[term.cols - 1] = [term.eraseAttr(), ' ', 1];
                        term.updateRange(term.buffer.y);
                        term.refresh(term.buffer.y, term.buffer.y);
                    }
                    term.write('\b');

                    buffer = '';
                    for (let i = 0; i < line.length; ++i) {
                        const c = line[i][1] || '';
                        buffer += c;
                    }
                    buffer = buffer.trim();
                    return;
                }

                // Non-printable keys (e.g. ctrl-x)
                if (nonPrintableKey) {
                    onData(buffer);
                    buffer = '';

                    onData(key);
                    return;
                }

                // Left, Right
                if (includes(['ArrowLeft', 'ArrowRight'], event.key)) {
                    return;
                }

                // Up, Down
                if (includes(['ArrowUp', 'ArrowDown'], event.key)) {
                    if (event.key === 'ArrowUp') {
                        if (!historyCommand) {
                            historyCommand = this.history.current() || '';
                        } else if (this.history.index > 0) {
                            historyCommand = this.history.back() || '';
                        }
                    } else if (event.key === 'ArrowDown') {
                        historyCommand = this.history.forward() || '';
                    }

                    buffer = historyCommand;

                    term.eraseLine(term.buffer.y);
                    term.buffer.x = 0;
                    term.write(buffer);
                    return;
                }

                // Check if cursor position is at the end of the window
                if (term.buffer.x >= term.cols) {
                    return;
                }

                term.write(key);
                buffer += key;
            };
        })(),
        onPaste: (data, event) => {
            this.term.write(data);
        }
    };
    term = null;

    constructor(props) {
        super(props);

        const { cursorBlink, scrollback, tabStopWidth } = this.props;
        this.term = new Xterm({
            cursorBlink,
            scrollback,
            tabStopWidth
        });
    }
    componentDidMount() {
        this.term.on('resize', this.eventHandler.onResize);
        this.term.on('key', this.eventHandler.onKey);
        this.term.on('paste', this.eventHandler.onPaste);

        const el = ReactDOM.findDOMNode(this);
        const focus = false;
        this.term.open(el, focus);

        // Fix an issue that caused the vertical scrollbar unclickable
        // @see https://github.com/sourcelair/xterm.js/issues/512
        const viewport = el.querySelector('.terminal .xterm-viewport');
        if (viewport) {
            viewport.style.overflowY = 'scroll';
        }
        const rows = el.querySelector('.terminal .xterm-rows');
        if (rows) {
            const scrollbarWidth = this.getScrollbarWidth() || 0;
            rows.style.position = 'absolute';
            rows.style.top = '0px';
            rows.style.right = `${scrollbarWidth}px`;
            rows.style.left = '5px';
            rows.style.overflow = 'hidden';
        }

        setTimeout(() => {
            this.resize();
        }, 0);
    }
    componentWillUnmount() {
        this.term.off('resize', this.eventHandler.onResize);
        this.term.off('key', this.eventHandler.onKey);
        this.term.off('paste', this.eventHandler.onPaste);
    }
    componentWillReceiveProps(nextProps) {
        // The new column width is determined in componentDidUpdate()

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
    componentDidUpdate() {
        setTimeout(() => {
            this.resize();
        }, 0);
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
    resize() {
        if (!(this.term && this.term.element)) {
            return;
        }
        const geometry = fit.proposeGeometry(this.term);
        if (geometry) {
            const cols = (!this.props.cols || this.props.cols === 'auto')
                ? geometry.cols
                : Math.max(this.props.cols, geometry.cols);
            const rows = (!this.props.rows || this.props.rows === 'auto')
                ? geometry.rows
                : this.props.rows;

            this.term.resize(cols, rows);
        }
    }
    clear() {
        this.term.clear();
    }
    write(data) {
        this.term.write(data);
    }
    writeln(data) {
        this.term.writeln(data);
    }
    render() {
        const { className, style } = this.props;

        return (
            <div
                className={classNames(className, styles.terminalContainer)}
                style={style}
            />
        );
    }
}

export default Terminal;
