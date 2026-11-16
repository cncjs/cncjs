/* eslint-env jest */
import { colsKeepingPendingInput, fitsOnRow, getInputCapacity, readInputLine } from '../input';

const PROMPT = '> ';

// An xterm row: [attr, char, width] cells, blank-padded to the width the row had when it was written
const makeRow = (text, width) => Array.from(
  { length: Math.max(width, text.length) },
  (_, i) => [0, text[i] || ' ', 1]
);

const read = (text, rowWidth, cols, isWrapped = false) => readInputLine({
  cells: makeRow(text, rowWidth),
  isWrapped,
  cols,
  prompt: PROMPT
});

describe('console input line', () => {
  describe('readInputLine', () => {
    test.each([80, 254, 500])('returns a command that fills the row at %i columns, byte for byte', (cols) => {
      const command = 'G1'.padEnd(cols - PROMPT.length - 1, 'X');
      const result = read(PROMPT + command, cols, cols);
      expect(result).toEqual({ ok: true, command });
      expect(`${result.command}\r`).toBe(`${command}\r`);
    });

    test('preserves the exact text, including repeated spaces, and drops trailing blanks', () => {
      const command = 'G1 F100.000000 X123.456789 Y123.456789  Z100';
      const result = read(`${PROMPT}${command}   `, 254, 254);
      expect(`${result.command}\r`).toBe('G1 F100.000000 X123.456789 Y123.456789  Z100\r');
    });

    test('refuses the tail of a wrapped command instead of sending a fragment', () => {
      const tail = 'Y123.456789  Z100';
      expect(read(tail, 80, 80, true)).toEqual({ ok: false, reason: 'wrapped' });
      expect(read(tail, 80, 80, false)).toEqual({ ok: false, reason: 'prompt-missing' });
    });

    test('refuses text beyond the visible width instead of sending it unseen', () => {
      const command = `G1 F100.000000 X123.456789 Y123.456789  Z100 ${'M'.repeat(60)}`;
      expect(read(PROMPT + command, 254, 80)).toEqual({ ok: false, reason: 'hidden' });
    });

    test('ignores blank cells beyond the visible width', () => {
      expect(read(`${PROMPT}G0 X1`, 254, 80)).toEqual({ ok: true, command: 'G0 X1' });
    });
  });

  describe('fitsOnRow', () => {
    test.each([80, 254, 500])('accepts exactly the visible capacity at %i columns and rejects one more', (cols) => {
      const capacity = getInputCapacity(cols, PROMPT.length);
      expect(capacity).toBe(cols - PROMPT.length - 1);
      expect(fitsOnRow('x'.repeat(capacity), cols, PROMPT.length)).toBe(true);
      expect(fitsOnRow('x'.repeat(capacity + 1), cols, PROMPT.length)).toBe(false);
    });

    test('never reports a negative capacity', () => {
      expect(getInputCapacity(1, PROMPT.length)).toBe(0);
    });
  });
});

describe('colsKeepingPendingInput', () => {
    test('does not shrink below the text being typed', () => {
      expect(colsKeepingPendingInput(120, 152, 254)).toBe(153);
    });

    test('shrinks fully when the text fits, and always allows growing', () => {
      expect(colsKeepingPendingInput(120, 40, 254)).toBe(120);
      expect(colsKeepingPendingInput(120, 0, 254)).toBe(120);
      expect(colsKeepingPendingInput(300, 280, 254)).toBe(300);
    });
});
