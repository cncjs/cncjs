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
    historyCommand = '';

    eventHandler = {
        onResize: (size) => {
            const { rows, cols } = { ...size };
            log.debug(`Resizing the terminal to ${rows} rows and ${cols} cols`);
        },
        onKey: (() => {
            let buffer = '';

            return (key, event) => {
                const { onData } = this.props;
                const term = this.term;
                const nonPrintableKey = (event.altKey || event.altGraphKey || event.ctrlKey || event.metaKey);

                // Enter
                if (event.key === 'Enter') {
                    if (buffer.length > 0) {
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
                    let line = term.lines.get(term.ybase + term.y);
                    let x = term.x;
                    if (line && x > 0) {
                        for (; x < term.cols; ++x) {
                            line[x - 1] = line[x];
                        }
                        line[term.cols - 1] = [term.eraseAttr(), ' ', 1];
                        term.updateRange(term.y);
                        term.refresh(term.y, term.y);
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
                        if (!this.historyCommand) {
                            this.historyCommand = this.history.current() || '';
                        } else if (this.history.index > 0) {
                            this.historyCommand = this.history.back() || '';
                        }
                    } else if (event.key === 'ArrowDown') {
                        this.historyCommand = this.history.forward() || '';
                    }

                    term.eraseLine(term.y);
                    term.x = 0;
                    term.write(this.historyCommand);
                    return;
                }

                // Check if cursor position is at the end of the window
                if (term.x >= term.cols) {
                    return;
                }

                term.write(key);
                buffer += key;
            };
        })()
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

        const el = ReactDOM.findDOMNode(this);
        const focus = false;
        this.term.open(el, focus);

        setTimeout(() => {
            this.resize();
        }, 0);
    }
    componentWillUnmount() {
        this.term.off('resize', this.eventHandler.onResize);
        this.term.off('key', this.eventHandler.onKey);
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
