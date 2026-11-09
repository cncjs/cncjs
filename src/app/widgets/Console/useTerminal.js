import _trimEnd from 'lodash/trimEnd';
import PerfectScrollbar from 'perfect-scrollbar';
import { ensurePositiveNumber } from 'ensure-type';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import chalk from '@app/chalk';
import { limit } from '@app/lib/normalize-range';
import log from '@app/lib/log';
import History from './History';

const PROMPT = '> ';
const FONT_FAMILY = 'Consolas, Menlo, Monaco, Lucida Console, Liberation Mono, DejaVu Sans Mono, Bitstream Vera Sans Mono, Courier New, monospace, serif';

function useTerminal({
  enabled,
  cols,
  rows,
  cursorBlink,
  scrollback,
  tabStopWidth,
  onData,
}) {
  const [containerNode, setContainerNode] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const termRef = useRef(null);
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

  const onResize = useCallback(() => {
    scrollbarRef.current?.update();
  }, []);

  const onKey = useCallback((event) => {
    const { key, domEvent } = event;
    const term = termRef.current;
    if (!term) {
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

    if (domEvent.key === 'ArrowDown' || domEvent.key === 'PageDown') {
      const historyCommand = historyRef.current.forward() || '';
      historyCommandRef.current = historyCommand;
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
      for (let index = PROMPT.length; index < currentBufferLine.length; ++index) {
        currentBufferLine.setCell(index, nullCell);
      }
      term.write('\r');
      term.write(PROMPT);
      term.write(historyCommand);
      return;
    }

    if (domEvent.key === 'ArrowLeft') {
      if (bufferX > PROMPT.length) {
        term.write(key);
      }
      return;
    }

    if (domEvent.key === 'ArrowRight') {
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
      let command = line.slice(PROMPT.length);
      if (command.length > 0) {
        historyCommandRef.current = '';
        historyRef.current.resetIndex();
        historyRef.current.push(command);
      }
      command += key;
      log.debug('xterm>', command);
      onDataRef.current?.(command);
      term.prompt();
      return;
    }

    if (domEvent.key === 'Escape') {
      for (let index = PROMPT.length; index < currentBufferLine.length; ++index) {
        currentBufferLine.setCell(index, nullCell);
      }
      term.write('\r');
      term.write(PROMPT);
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

    if (bufferX < (term.cols - 1)) {
      term.write(key);
    }
  }, []);

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
  }, []);

  const resize = useCallback((nextCols = colsRef.current, nextRows = rowsRef.current) => {
    const term = termRef.current;
    if (!(term && term.element)) {
      return;
    }

    term.refresh(0, term.rows - 1);
    const geometry = fitAddonRef.current?.proposeDimensions();
    if (!geometry) {
      return;
    }

    const resolvedCols = (!nextCols || nextCols === 'auto') ? geometry.cols : nextCols;
    const resolvedRows = (!nextRows || nextRows === 'auto') ? geometry.rows : nextRows;
    term.resize(resolvedCols, resolvedRows);
  }, []);

  const clear = useCallback(() => termRef.current?.clear(), []);
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
  const writeln = useCallback((data, callback) => {
    const term = termRef.current;
    if (!term) {
      return;
    }
    const buffer = term._core.buffer;
    const currentLineIndex = buffer.ybase + buffer.y;
    const currentBufferLine = buffer.lines.get(currentLineIndex);
    const cursorX = buffer.x;
    const line = _trimEnd(currentBufferLine.translateToString());
    const input = (line.length > PROMPT.length) ? line.slice(PROMPT.length) : '';
    const cursorOffset = limit(cursorX - PROMPT.length, 0, input.length);
    const cursorLeft = input.length - cursorOffset;
    const restoreCursor = (cursorLeft > 0) ? `\x1b[${cursorLeft}D` : '';
    term.write(`\x1b[2K\r${data}\r\n${chalk.white(PROMPT + input)}${restoreCursor}`, callback);
  }, []);

  useEffect(() => {
    if (!enabled || !containerNode) {
      setIsReady(false);
      return undefined;
    }

    const term = new XTerm({
      cursorBlink: cursorBlinkRef.current,
      scrollback: scrollbackRef.current,
      tabStopWidth: tabStopWidthRef.current,
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
    term.focus(false);
    term.setOption('fontFamily', FONT_FAMILY);

    const xtermElement = containerNode.querySelector('.xterm');
    if (xtermElement) {
      xtermElement.style.paddingLeft = '3px';
    }
    const viewportElement = containerNode.querySelector('.xterm-viewport');
    scrollbarRef.current = viewportElement ? new PerfectScrollbar(viewportElement) : null;
    setIsReady(true);

    return () => {
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
  }, [containerNode, enabled, onKey, onPaste, onResize]);

  useEffect(() => {
    const term = termRef.current;
    if (!term || !isReady) {
      return;
    }
    term.setOption('cursorBlink', cursorBlink);
    term.setOption('scrollback', scrollback);
    term.setOption('tabStopWidth', tabStopWidth);
    resize(cols, rows);
  }, [cols, rows, cursorBlink, scrollback, tabStopWidth, isReady, resize]);

  const actions = useMemo(() => ({
    clear,
    clearSelection,
    refresh,
    resize,
    selectAll,
    writeln,
  }), [clear, clearSelection, refresh, resize, selectAll, writeln]);

  return {
    containerRef,
    isReady,
    prompt: PROMPT,
    actions,
  };
}

export default useTerminal;
