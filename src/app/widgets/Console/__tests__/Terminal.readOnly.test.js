/* eslint-env jest */
import { Terminal } from 'xterm';
import TerminalWrapper from '../Terminal';

// Runs in Jest's node environment: a stand-in textarea and document are used, no DOM
jest.mock('../index.styl', () => ({}));

// The component is constructed without mounting; only the read-only handling is exercised
const make = (props) => new TerminalWrapper({ ...TerminalWrapper.defaultProps, ...props });

const fakeTextarea = () => {
  const attributes = {};
  return {
    readOnly: false,
    setAttribute: (name, value) => {
      attributes[name] = String(value);
    },
    getAttribute: (name) => (name in attributes ? attributes[name] : null),
    hasAttribute: (name) => name in attributes,
    removeAttribute: (name) => {
      delete attributes[name];
    },
    blur: jest.fn()
  };
};

const cells = (text, cols = 10) => [...text.padEnd(cols)].map((ch) => [0, ch, 1]);
const fakeTerm = (textarea, rows = []) => ({
  textarea,
  buffer: { lines: { get: (i) => (rows[i] ? cells(rows[i]) : null) }, ybase: 0, y: Math.max(0, rows.length - 1), x: 0 },
  eraseLine: jest.fn(),
  write: jest.fn(),
  setOption: jest.fn(),
  clear: jest.fn()
});

describe('Terminal read-only mode (command input shown)', () => {
  let textarea;

  beforeEach(() => {
    textarea = fakeTextarea();
    global.document = { activeElement: null };
  });

  afterEach(() => {
    delete global.document;
  });

  test('keeps on-screen keyboards closed and releases the focus', () => {
    const wrapper = make({ readOnly: true });
    wrapper.term = fakeTerm(textarea);
    global.document.activeElement = textarea;

    wrapper.applyReadOnly(true);
    expect(textarea.getAttribute('inputmode')).toBe('none');
    expect(textarea.readOnly).toBe(true);
    expect(textarea.blur).toHaveBeenCalled();
    expect(wrapper.term.write).toHaveBeenCalledWith(expect.stringContaining('\x1b[?25l'));
  });

  test('does not touch the focus when the terminal does not have it', () => {
    const wrapper = make({ readOnly: true });
    wrapper.term = fakeTerm(textarea);

    wrapper.applyReadOnly(true);
    expect(textarea.blur).not.toHaveBeenCalled();
  });

  test('restores normal input when switched off', () => {
    const wrapper = make({ readOnly: false });
    wrapper.term = fakeTerm(textarea);
    textarea.setAttribute('inputmode', 'none');
    textarea.readOnly = true;

    wrapper.applyReadOnly(false);
    expect(textarea.hasAttribute('inputmode')).toBe(false);
    expect(textarea.readOnly).toBe(false);
  });

  test('ignores keys and pastes while read-only', () => {
    const onData = jest.fn();
    const wrapper = make({ readOnly: true, onData });
    wrapper.term = fakeTerm(textarea);

    wrapper.eventHandler.onKey('a', { key: 'a' });
    wrapper.eventHandler.onPaste('G0 X10', {});
    expect(wrapper.keyBacklog).toEqual([]);
    expect(onData).not.toHaveBeenCalled();
  });

  test('queues keys as before when not read-only', () => {
    const wrapper = make({ readOnly: false });
    wrapper.term = fakeTerm(textarea);
    wrapper.drainTimer = 1; // keep the queue from draining into the fake terminal

    wrapper.eventHandler.onKey('a', { key: 'a' });
    expect(wrapper.keyBacklog).toEqual([['a', { key: 'a' }]]);
  });

  test('writes output without a prompt row or a trailing empty row while read-only', () => {
    const wrapper = make({ readOnly: true });
    wrapper.term = fakeTerm(textarea);

    wrapper.writeln('ok');
    wrapper.writeln('next');
    expect(wrapper.term.write.mock.calls).toEqual([['\x1b[2K\rok'], ['\r\nnext']]);
  });

  test('puts the prompt below the last output line when switched off', () => {
    const wrapper = make({ readOnly: false });
    wrapper.term = fakeTerm(textarea);
    wrapper.useCursorRowForOutput = true;

    wrapper.applyReadOnly(false);
    expect(wrapper.term.write).toHaveBeenCalledWith(expect.stringContaining('\x1b[?25h\r\n'));
    expect(wrapper.useCursorRowForOutput).toBe(false);
  });

  test('removes the prompt row and continues after the last output line', () => {
    const wrapper = make({ readOnly: true });
    wrapper.term = fakeTerm(textarea, ['ok', '> ']);

    wrapper.applyReadOnly(true);
    expect(wrapper.term.write).toHaveBeenCalledWith('\x1b[2K\x1b[A\x1b[3G');
    expect(wrapper.useCursorRowForOutput).toBe(true);
  });

  test('clears the prompt row in place when there is no output above it', () => {
    const wrapper = make({ readOnly: true });
    wrapper.term = fakeTerm(textarea, ['> ']);

    wrapper.applyReadOnly(true);
    expect(wrapper.term.write).toHaveBeenCalledWith('\x1b[2K\r');
    expect(wrapper.useCursorRowForOutput).toBe(false);
  });

  test('clears scrollback and queued output before writing new output on the first row', async () => {
    const wrapper = make({ readOnly: true });
    const term = new Terminal({ cols: 20, rows: 2 });
    wrapper.term = term;
    const drainWrites = () => new Promise(resolve => {
      setTimeout(resolve, 0);
    });

    wrapper.writeln('history');
    wrapper.writeln('old 1');
    wrapper.writeln('old 2');
    await drainWrites();

    wrapper.writeln('queued 1');
    wrapper.writeln('queued 2');
    wrapper.clear();
    wrapper.writeln('new output');
    await drainWrites();

    const { buffer } = term;
    const lines = Array.from({ length: buffer.lines.length }, (_, index) => buffer.translateBufferLineToString(index, true));
    expect(lines).toEqual(['new output', '']);
  });

  test('keeps the prompt row on clear when not read-only', () => {
    const wrapper = make({ readOnly: false });
    wrapper.term = fakeTerm(textarea);

    wrapper.clear();
    expect(wrapper.term.clear).toHaveBeenCalled();
    expect(wrapper.term.write).not.toHaveBeenCalled();
  });
});
