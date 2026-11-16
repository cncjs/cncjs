/* eslint-env jest */
jest.mock('app/lib/log', () => ({ debug: jest.fn(), warn: jest.fn(), error: jest.fn() }));
jest.mock('app/lib/i18n', () => ({ _: text => text }));
jest.mock('app/lib/chalk', () => ({ white: text => text, yellow: text => text }));
jest.mock('perfect-scrollbar', () => jest.fn());
jest.mock('xterm', () => ({ Terminal: { applyAddon: jest.fn() } }));
jest.mock('xterm/lib/addons/fit/fit', () => ({ proposeGeometry: jest.fn(() => ({ cols: 100, rows: 30 })) }));
jest.mock('../index.styl', () => ({ terminalContainer: 'terminal-container' }));

const TerminalWrapper = require('../Terminal').default;

const PROMPT = '> ';

// A fake xterm: one row of [attr, char, width] cells, which is all the key handler reads
const makeTerm = ({ text = PROMPT, cols = 80, rowWidth = cols, isWrapped = false } = {}) => {
  const cells = Array.from({ length: Math.max(rowWidth, text.length) }, (_, i) => [0, text[i] || ' ', 1]);
  cells.isWrapped = isWrapped;
  return {
    cols,
    cells,
    buffer: { ybase: 0, y: 0, x: PROMPT.length, lines: { get: () => cells } },
    eraseLine: jest.fn(),
    write: jest.fn(),
    prompt: jest.fn()
  };
};

const create = (termOptions) => {
  const onData = jest.fn();
  const wrapper = new TerminalWrapper({ onData });
  wrapper.term = makeTerm(termOptions);
  return { wrapper, onData, term: wrapper.term };
};

const press = (wrapper, name, text = name) => wrapper.eventHandler.onKey(text, { key: name });

describe('Terminal command submission', () => {
  test('sends the complete command exactly as typed', () => {
    const { wrapper, onData } = create({ text: `${PROMPT}G1 F100.000000 X123.456789 Y123.456789  Z100` });
    press(wrapper, 'Enter', '\r');
    expect(onData).toHaveBeenCalledTimes(1);
    expect(onData).toHaveBeenCalledWith('G1 F100.000000 X123.456789 Y123.456789  Z100\r');
  });

  test('sends nothing for the wrapped tail of a long command', () => {
    const { wrapper, onData, term } = create({ text: 'Y123.456789  Z100', isWrapped: true });
    press(wrapper, 'Enter', '\r');
    expect(onData).not.toHaveBeenCalled();
    expect(term.write).toHaveBeenCalledWith(expect.stringContaining('Command not sent'));
  });

  test('sends nothing when text lies beyond the visible width', () => {
    const { wrapper, onData } = create({ text: `${PROMPT}${'G1 X1 '.repeat(20)}`, cols: 80, rowWidth: 254 });
    press(wrapper, 'Enter', '\r');
    expect(onData).not.toHaveBeenCalled();
  });
});

describe('Terminal history recall', () => {
  test('recalls an entry that fits the terminal width', () => {
    const { wrapper, term } = create({ cols: 80 });
    wrapper.history.push('G0 X1');
    press(wrapper, 'ArrowUp');
    expect(term.write).toHaveBeenCalledWith('G0 X1');
  });

  test('does not recall or send an entry wider than the terminal', () => {
    const { wrapper, onData, term } = create({ cols: 80 });
    const longCommand = `G1 ${'X123.456789 '.repeat(8)}`;
    wrapper.history.push(longCommand);
    press(wrapper, 'ArrowUp');
    expect(term.write).not.toHaveBeenCalledWith(longCommand);
    expect(term.write).toHaveBeenCalledWith(expect.stringContaining('does not fit'));
    expect(onData).not.toHaveBeenCalled();
  });
});

describe('hasPendingInput', () => {
  test('is false for an empty prompt and when there is no terminal', () => {
    expect(create({ text: PROMPT }).wrapper.hasPendingInput()).toBe(false);
    expect(new TerminalWrapper({}).hasPendingInput()).toBe(false);
  });

  test('is true while a command is being typed', () => {
    expect(create({ text: `${PROMPT}G0 X1` }).wrapper.hasPendingInput()).toBe(true);
  });
});

describe('Terminal resize after a submitted line', () => {
  test('applies a held-back shrink even though the buffer still shows the sent line', () => {
    // The terminal is 142 wide because a 140-character command was pending when the window shrank
    const { wrapper, term } = create({ text: `${PROMPT}${'X'.repeat(140)}`, cols: 142 });
    term.element = {};
    term.resize = jest.fn();
    wrapper.proposeCols = () => 100;
    wrapper.proposeRows = () => 30;
    wrapper.trimToFit = jest.fn();
    wrapper.deferredResize = true;

    wrapper.applyDeferredResize();

    expect(term.resize).toHaveBeenCalledWith(100, 30);
    expect(wrapper.deferredResize).toBe(false);
  });
});

describe('Terminal key handling under fast input', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  // Model xterm: write() only queues; the cursor and the cells change when the queue is flushed
  const queueWrites = (term) => {
    term.writeBuffer = [];
    term.writeInProgress = false;
    term.write = jest.fn(data => {
      term.writeBuffer.push(data);
      term.writeInProgress = true;
    });
    return () => {
      term.writeBuffer.forEach(ch => {
        term.cells[term.buffer.x] = [0, ch, 1];
        term.buffer.x += 1;
      });
      term.writeBuffer = [];
      term.writeInProgress = false;
    };
  };

  const settle = (flush) => {
    for (let i = 0; i < 600; ++i) {
      flush();
      jest.advanceTimersByTime(1);
    }
  };

  test('a burst of keys never overruns the last column', () => {
    const { wrapper, term } = create({ cols: 80 });
    const flush = queueWrites(term);
    for (let i = 0; i < 200; ++i) {
      press(wrapper, '0');
    }
    settle(flush);
    expect(term.buffer.x).toBe(term.cols - 1);
  });

  test('Enter pressed right after the last key sends the complete command', () => {
    const { wrapper, onData, term } = create({ cols: 80 });
    const flush = queueWrites(term);
    [...'G0 X10'].forEach(ch => press(wrapper, ch));
    press(wrapper, 'Enter', '\r');
    settle(flush);
    expect(onData).toHaveBeenCalledTimes(1);
    expect(onData).toHaveBeenCalledWith('G0 X10\r');
  });
});
