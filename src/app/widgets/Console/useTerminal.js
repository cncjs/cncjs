import _trimEnd from 'lodash/trimEnd';
import PerfectScrollbar from 'perfect-scrollbar';
import { ensurePositiveNumber } from 'ensure-type';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import chalk from '@app/chalk';
import { limit } from '@app/lib/normalize-range';
import log from '@app/lib/log';
import i18n from '@app/lib/i18n';
import { DEFAULT_FONT_SIZE, DEFAULT_BACKGROUND, DEFAULT_TEXT_COLOR, DEFAULT_FONT_STACK, TERMINAL_COLS_MIN, TERMINAL_COLS_MAX } from './constants';
import { buildTerminalTheme } from './terminal-theme';
import { fitsOnRow, getInputCapacity, readInputLine, colsKeepingPendingInput } from './input';
import History from './History';

const PROMPT = '> ';
const pendingExtent = term => {
  const buffer = term._core.buffer;
  const text = _trimEnd(buffer.lines.get(buffer.ybase + buffer.y)?.translateToString() || '');
  return text.startsWith(PROMPT) ? text.length : PROMPT.length;
};

function useTerminal({
  enabled,
  readOnly = false,
  cols,
  rows,
  cursorBlink,
  scrollback,
  tabStopWidth,
  onData,
  fontSize = DEFAULT_FONT_SIZE,
  background = DEFAULT_BACKGROUND,
  textColor = DEFAULT_TEXT_COLOR,
}) {
  const [containerNode, setContainerNode] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const termRef = useRef(null);
  const readOnlyRef = useRef(readOnly);
  const desiredReadOnlyRef = useRef(readOnly);
  desiredReadOnlyRef.current = readOnly;
  const useCursorRowForOutput = useRef(false);
  const operationsRef = useRef([]);
  const appearanceRef = useRef({ fontSize, background, textColor });
  const remeasureRef = useRef(false);
  appearanceRef.current = { fontSize, background, textColor };
  const fitAddonRef = useRef(null);
  const scrollbarRef = useRef(null);
  const historyRef = useRef(new History(1000));
  const historyCommandRef = useRef('');
  const onDataRef = useRef(onData);
  const colsRef = useRef(cols);
  const rowsRef = useRef(rows);
  const cursorBlinkRef = useRef(cursorBlink);
  const scrollbackRef = useRef(scrollback);
  const tabStopWidthRef = useRef(tabStopWidth);

  onDataRef.current = onData;
  colsRef.current = cols;
  rowsRef.current = rows;
  cursorBlinkRef.current = cursorBlink;
  scrollbackRef.current = scrollback;
  tabStopWidthRef.current = tabStopWidth;

  const containerRef = useCallback((node) => {
    setContainerNode(node);
  }, []);

  // xterm parses write() asynchronously. Serialize keys, output and resizing against
  // write callbacks so command submission always reads the complete visible row.
  const enqueue = useCallback((operation) => {
    const term = termRef.current;
    if (!term) {
      return;
    }
    const queue = operationsRef.current;
    queue.push(operation);
    if (queue.length !== 1) {
      return;
    }
    const drain = () => {
      if (termRef.current !== term || !queue.length) {
        return;
      }
      term.write('', () => {
        if (termRef.current !== term) {
          return;
        }
        queue[0]();
        term.write('', () => {
          queue.shift();
          drain();
        });
      });
    };
    drain();
  }, []);

  const syncScrollbar = useCallback(() => {
    const container = termRef.current?.element?.parentElement;
    const viewport = container?.querySelector('.xterm-viewport');
    const rail = viewport?.querySelector('.ps__rail-y');
    const screen = container?.querySelector('.xterm-screen');
    if (container && viewport && rail && screen) {
      const width = Math.max(screen.offsetWidth + 3, container.clientWidth);
      viewport.style.width = `${width}px`;
      rail.style.transform = `translateX(${Math.min(0, container.scrollLeft - (width - container.clientWidth))}px)`;
    }
    scrollbarRef.current?.update();
  }, []);

  const resize = useCallback((nextCols = colsRef.current, nextRows = rowsRef.current) => {
    enqueue(() => {
      const term = termRef.current;
      if (!(term && term.element)) {
        return;
      }
      const container = term.element.parentElement;
      if (container && (!container.offsetWidth || !container.offsetHeight)) {
        remeasureRef.current = true;
        return;
      }
      const geometry = fitAddonRef.current?.proposeDimensions();
      if (!geometry || !Number.isFinite(geometry.cols) || !Number.isFinite(geometry.rows)) {
        return;
      }
      const requestedCols = (!nextCols || nextCols === 'auto')
        ? limit(geometry.cols, TERMINAL_COLS_MIN, TERMINAL_COLS_MAX) : nextCols;
      const resolvedRows = (!nextRows || nextRows === 'auto') ? Math.max(1, geometry.rows) : nextRows;
      const inputExtent = readOnlyRef.current ? PROMPT.length : pendingExtent(term);
      term.resize(colsKeepingPendingInput(requestedCols, inputExtent, term.cols), resolvedRows);
      term.refresh(0, term.rows - 1);
      syncScrollbar();
    });
  }, [enqueue, syncScrollbar]);

  const onResize = useCallback(() => {
    syncScrollbar();
  }, [syncScrollbar]);

  const handleKey = useCallback((event) => {
    const { key, domEvent } = event;
    const term = termRef.current;
    if (!term || readOnlyRef.current) {
      return;
    }

    const printable = !domEvent.altKey && !domEvent.altGraphKey && !domEvent.ctrlKey && !domEvent.metaKey;
    const currentLineIndex = term._core.buffer.ybase + term._core.buffer.y;
    const currentBufferLine = term._core.buffer.lines.get(currentLineIndex);
    const bufferX = term._core.buffer.x;
    const bufferY = term._core.buffer.y;
    const nullCell = term._core.buffer.getNullCell();
    const line = _trimEnd(currentBufferLine.translateToString());

    if (!line) {
      return;
    }
    const notify = message => {
      term.write(`\x1b[2K\r${chalk.yellow(message)}`);
      term.prompt();
      resize();
    };

    if (domEvent.key === 'ArrowDown' || domEvent.key === 'PageDown') {
      const historyCommand = historyRef.current.forward() || '';
      historyCommandRef.current = historyCommand;
      if (!fitsOnRow(historyCommand, term.cols, PROMPT.length)) {
        notify(i18n._('This history entry does not fit the terminal width. Rewrite the command or increase Columns in Console Settings to recall it.'));
        return;
      }
      for (let index = PROMPT.length; index < currentBufferLine.length; ++index) {
        currentBufferLine.setCell(index, nullCell);
      }
      term.write('\r');
      term.write(PROMPT);
      term.write(historyCommand);
      return;
    }

    if (domEvent.key === 'ArrowUp' || domEvent.key === 'PageUp') {
      let historyCommand = historyCommandRef.current;
      if (!historyCommand) {
        historyCommand = historyRef.current.current() || '';
      } else if (historyRef.current.index > 0) {
        historyCommand = historyRef.current.back() || '';
      }
      historyCommandRef.current = historyCommand;
      if (!fitsOnRow(historyCommand, term.cols, PROMPT.length)) {
        notify(i18n._('This history entry does not fit the terminal width. Rewrite the command or increase Columns in Console Settings to recall it.'));
        return;
      }
      for (let index = PROMPT.length; index < currentBufferLine.length; ++index) {
        currentBufferLine.setCell(index, nullCell);
      }
      term.write('\r');
      term.write(PROMPT);
      term.write(historyCommand);
      return;
    }

    if (domEvent.key === 'ArrowLeft' && !domEvent.metaKey) {
      if (bufferX > PROMPT.length) {
        term.write(key);
      }
      return;
    }

    if (domEvent.key === 'ArrowRight' && !domEvent.metaKey) {
      const x = line.length - 1;
      if (bufferX <= x) {
        term.write(key);
      }
      return;
    }

    if (domEvent.key === 'Backspace') {
      if (bufferX <= PROMPT.length || bufferX === 0) {
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

    if (domEvent.key === 'End' || (domEvent.metaKey && domEvent.key === 'ArrowRight')) {
      if (bufferX < line.length) {
        term._core.buffer.x = line.length;
      }
      term._core.refresh(bufferY, bufferY);
      return;
    }

    if (domEvent.key === 'Enter') {
      const input = readInputLine({ line: currentBufferLine, cols: term.cols, prompt: PROMPT });
      if (!input.ok) {
        notify(i18n._('Command not sent: it does not fit the terminal width. Rewrite the command or increase Columns in Console Settings.'));
        return;
      }
      let command = input.command;
      if (command.length > 0) {
        historyCommandRef.current = '';
        historyRef.current.resetIndex();
        historyRef.current.push(command);
      }
      command += key;
      log.debug('xterm>', command);
      onDataRef.current?.(command);
      term.prompt();
      resize();
      return;
    }

    if (domEvent.key === 'Escape') {
      for (let index = PROMPT.length; index < currentBufferLine.length; ++index) {
        currentBufferLine.setCell(index, nullCell);
      }
      term.write('\r');
      term.write(PROMPT);
      resize();
      return;
    }

    if (domEvent.key === 'Home' || (domEvent.metaKey && domEvent.key === 'ArrowLeft')) {
      term.write('\r');
      term.write(PROMPT);
      return;
    }

    if (!printable) {
      onDataRef.current?.(key);
      return;
    }

    if (Math.max(line.length - PROMPT.length, bufferX - PROMPT.length) + key.length > getInputCapacity(term.cols, PROMPT.length)) {
      return;
    }
    if (bufferX < (term.cols - 1)) {
      for (let index = currentBufferLine.length - 1; index > bufferX; --index) {
        const cell = {};
        currentBufferLine.loadCell(index - 1, cell);
        currentBufferLine.setCell(index, cell);
      }
      term.write(key);
    }
  }, [resize]);

  const onKey = useCallback(event => enqueue(() => handleKey(event)), [enqueue, handleKey]);

  const onPaste = useCallback((event) => {
    event.stopPropagation();
    event.preventDefault();

    const clipboardData = event.clipboardData;
    if (!clipboardData) {
      return;
    }

    const term = termRef.current;
    if (!term) {
      return;
    }

    const pastedData = clipboardData.getData('text/plain');
    if (readOnlyRef.current) {
      return;
    }
    enqueue(() => {
      if (readOnlyRef.current) {
        return;
      }
      const lines = String(pastedData)
        .replace(/(\r\n|\r|\n)/g, '\n')
        .split('\n')
        .slice(0, 10000);

      for (let index = 0; index < lines.length; ++index) {
        const line = lines[index].trim();
        if (!line.length) {
          continue;
        }
        onDataRef.current?.(line + '\n');
        term.write(chalk.white(line));
        term.prompt();
      }
      resize();
    });
  }, [enqueue, resize]);

  const clear = useCallback(() => enqueue(() => {
    const term = termRef.current;
    if (readOnlyRef.current) {
      term.write('\x1b[2K\r', () => term.clear());
      useCursorRowForOutput.current = false;
    } else {
      term.clear();
    }
  }), [enqueue]);
  const clearSelection = useCallback(() => termRef.current?.clearSelection(), []);
  const refresh = useCallback((...args) => {
    const term = termRef.current;
    if (!term) {
      return;
    }
    let [start = 0, end = term.rows - 1] = args;
    start = limit(ensurePositiveNumber(start), 0, term.rows - 1);
    end = limit(ensurePositiveNumber(end), start, term.rows - 1);
    term.refresh(start, end);
  }, []);
  const selectAll = useCallback(() => termRef.current?.selectAll(), []);
  const writeln = useCallback((data, callback) => enqueue(() => {
    const term = termRef.current;
    if (!term) {
      return;
    }
    if (readOnlyRef.current) {
      term.write(`${useCursorRowForOutput.current ? '\r\n' : '\x1b[2K\r'}${data}`, callback);
      useCursorRowForOutput.current = true;
      return;
    }
    const buffer = term._core.buffer;
    const currentLineIndex = buffer.ybase + buffer.y;
    const currentBufferLine = buffer.lines.get(currentLineIndex);
    const cursorX = buffer.x;
    const line = _trimEnd(currentBufferLine.translateToString());
    const input = line.startsWith(PROMPT) ? line.slice(PROMPT.length) : '';
    const cursorOffset = limit(cursorX - PROMPT.length, 0, input.length);
    const cursorLeft = input.length - cursorOffset;
    const restoreCursor = (cursorLeft > 0) ? `\x1b[${cursorLeft}D` : '';
    term.write(`\x1b[2K\r${data}\r\n${chalk.white(PROMPT + input)}${restoreCursor}`, callback);
  }), [enqueue]);

  const hasPendingInput = useCallback(() => (
    operationsRef.current.length > 0 || !!(!readOnlyRef.current && termRef.current && pendingExtent(termRef.current) > PROMPT.length)
  ), []);

  useEffect(() => {
    if (!enabled || !containerNode) {
      setIsReady(false);
      return undefined;
    }

    const term = new XTerm({
      cols: typeof colsRef.current === 'number' ? colsRef.current : 80,
      rows: typeof rowsRef.current === 'number' ? rowsRef.current : 24,
      cursorBlink: cursorBlinkRef.current,
      scrollback: scrollbackRef.current,
      tabStopWidth: tabStopWidthRef.current,
      fontSize: appearanceRef.current.fontSize,
      fontFamily: DEFAULT_FONT_STACK,
      lineHeight: 1.2,
      letterSpacing: 1,
      theme: buildTerminalTheme(appearanceRef.current.background, appearanceRef.current.textColor),
    });
    const fitAddon = new FitAddon();
    historyRef.current = new History(1000);
    historyCommandRef.current = '';
    termRef.current = term;
    fitAddonRef.current = fitAddon;
    term.loadAddon(fitAddon);
    term.prompt = () => {
      term.write('\r\n');
      term.write(chalk.white(PROMPT));
    };
    term.open(containerNode);
    const keyDisposable = term.onKey(onKey);
    if (term.textarea) {
      term.textarea.onpaste = onPaste;
    }
    const resizeDisposable = term.onResize(onResize);
    if (!desiredReadOnlyRef.current) {
      term.focus(false);
    }
    term.setOption('fontFamily', DEFAULT_FONT_STACK);

    const xtermElement = containerNode.querySelector('.xterm');
    if (xtermElement) {
      xtermElement.style.paddingLeft = '3px';
    }
    const viewportElement = containerNode.querySelector('.xterm-viewport');
    scrollbarRef.current = viewportElement ? new PerfectScrollbar(viewportElement, { suppressScrollX: true }) : null;
    containerNode.addEventListener('scroll', syncScrollbar, { passive: true });
    let frame;
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (containerNode.offsetWidth && containerNode.offsetHeight) {
          if (remeasureRef.current) {
            term.setOption('fontSize', appearanceRef.current.fontSize + 1);
            term.setOption('fontSize', appearanceRef.current.fontSize);
            remeasureRef.current = false;
          }
          resize();
        }
      });
    }) : null;
    observer?.observe(containerNode);
    setIsReady(true);

    return () => {
      observer?.disconnect();
      cancelAnimationFrame(frame);
      containerNode.removeEventListener('scroll', syncScrollbar);
      operationsRef.current = [];
      useCursorRowForOutput.current = false;
      keyDisposable?.dispose();
      resizeDisposable?.dispose();
      if (term.textarea) {
        term.textarea.onpaste = null;
      }
      scrollbarRef.current?.destroy();
      scrollbarRef.current = null;
      fitAddon.dispose?.();
      term.dispose?.();
      termRef.current = null;
      fitAddonRef.current = null;
      setIsReady(false);
    };
  }, [containerNode, enabled, onKey, onPaste, onResize, resize, syncScrollbar]);

  useEffect(() => {
    enqueue(() => {
      const term = termRef.current;
      const wasReadOnly = readOnlyRef.current;
      readOnlyRef.current = readOnly;
      term.setOption('disableStdin', readOnly);
      term.setOption('cursorBlink', !readOnly && cursorBlink);
      if (term.textarea) {
        term.textarea.readOnly = readOnly;
        term.textarea.setAttribute?.('inputmode', readOnly ? 'none' : 'text');
        if (readOnly) {
          term.textarea.blur?.();
        }
      }
      if (readOnly) {
        if (!wasReadOnly || !useCursorRowForOutput.current) {
          term.write('\x1b[2K\r\x1b[?25l');
          useCursorRowForOutput.current = false;
        }
      } else if (wasReadOnly) {
        term.write(`${useCursorRowForOutput.current ? '\r\n' : ''}${chalk.white(PROMPT)}\x1b[?25h`);
        useCursorRowForOutput.current = false;
      }
    });
  }, [readOnly, cursorBlink, isReady, enqueue]);

  useEffect(() => {
    const term = termRef.current;
    if (!term || !isReady) {
      return;
    }
    term.setOption('cursorBlink', !readOnlyRef.current && cursorBlink);
    term.setOption('scrollback', scrollback);
    term.setOption('tabStopWidth', tabStopWidth);
    resize(cols, rows);
  }, [cols, rows, cursorBlink, scrollback, tabStopWidth, isReady, resize]);

  useEffect(() => {
    const term = termRef.current;
    if (!term || !isReady) {
      return;
    }
    const theme = buildTerminalTheme(background, textColor);
    term.setOption('fontSize', fontSize);
    term.setOption('theme', theme);
    const container = term.element?.parentElement;
    if (container) {
      container.style.backgroundColor = theme.background;
      container.style.setProperty('--terminal-bg', theme.background);
      container.style.setProperty('--terminal-thumb', background === 'white' ? '#808080' : '#999999');
      container.querySelectorAll('.xterm, .xterm-viewport').forEach(node => {
        node.style.backgroundColor = theme.background;
      });
      remeasureRef.current = !container.offsetWidth || !container.offsetHeight;
    }
    term.refresh(0, term.rows - 1);
    resize();
  }, [fontSize, background, textColor, isReady, resize]);

  const actions = useMemo(() => ({
    clear,
    clearSelection,
    refresh,
    resize,
    selectAll,
    writeln,
    hasPendingInput,
  }), [clear, clearSelection, refresh, resize, selectAll, writeln, hasPendingInput]);

  return {
    containerRef,
    isReady,
    prompt: PROMPT,
    actions,
  };
}

export default useTerminal;
