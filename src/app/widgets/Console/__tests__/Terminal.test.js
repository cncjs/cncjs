/* eslint-env jest */
jest.mock('app/lib/log', () => ({ debug: jest.fn(), warn: jest.fn(), error: jest.fn() }));
jest.mock('app/lib/i18n', () => ({ _: text => text }));
jest.mock('app/lib/chalk', () => ({ white: text => text, yellow: text => text }));
jest.mock('perfect-scrollbar', () => jest.fn());
jest.mock('xterm', () => ({ Terminal: { applyAddon: jest.fn() } }));
jest.mock('xterm/lib/addons/fit/fit', () => ({}));
jest.mock('../index.styl', () => ({ terminalContainer: 'terminal-container' }));

const TerminalWrapper = require('../Terminal').default;

const PROMPT = '> ';

// A fake xterm: one row of [attr, char, width] cells, which is all the key handler reads
const makeTerm = ({ text = PROMPT, cols = 80, rowWidth = cols, isWrapped = false } = {}) => {
  const cells = Array.from({ length: Math.max(rowWidth, text.length) }, (_, i) => [0, text[i] || ' ', 1]);
  cells.isWrapped = isWrapped;
  return {
    cols,
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
