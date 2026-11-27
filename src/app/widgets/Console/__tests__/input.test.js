import { fitsOnRow, getInputCapacity, readInputLine, colsKeepingPendingInput } from '../input';
import { normalizeConsoleColors, readConsoleSettings } from '../settings';
import { buildTerminalTheme } from '../terminal-theme';

const read = (text, cols, isWrapped = false) => readInputLine({
  line: { translateToString: () => text, isWrapped }, cols, prompt: '> ',
});

test.each([80, 254, 256, 500])('submits only a complete visible command at %i columns', cols => {
  const capacity = getInputCapacity(cols, 2);
  const command = 'X'.repeat(capacity);
  expect(fitsOnRow(command, cols, 2)).toBe(true);
  expect(read(`> ${command}`, cols)).toEqual({ ok: true, command });
  expect(read(`> ${command}X`, cols)).toEqual({ ok: false });
  expect(read(`> ${command}`, cols, true)).toEqual({ ok: false });
  expect(read(`response ${command}`, cols)).toEqual({ ok: false });
  expect(read('> ', cols)).toEqual({ ok: true, command: '' });
});

test('holds a shrink at the pending command extent while allowing growth', () => {
  expect(colsKeepingPendingInput(80, 152, 256)).toBe(153);
  expect(colsKeepingPendingInput(80, 40, 256)).toBe(80);
  expect(colsKeepingPendingInput(500, 152, 256)).toBe(500);
});

test('normalizes legacy colors and validates saved configuration without sharing defaults', () => {
  const saved = { terminalBackground: 'light', terminalCursorColor: 'red', fontSize: 'medium', terminalCols: 900, terminalRows: 'bad' };
  normalizeConsoleColors(saved);
  expect(saved).not.toHaveProperty('terminalCursorColor');
  expect(saved.terminalBackground).toBe('white');
  expect(readConsoleSettings(key => saved[key])).toEqual({ fontSize: 14, cols: 500, rows: 15, background: 'white', textColor: 'default' });
  expect(readConsoleSettings(() => undefined)).toEqual({ fontSize: 14, cols: 256, rows: 15, background: 'black', textColor: 'default' });
});

test.each(['default', 'green', 'amber', 'cyan'])('maps ANSI text, cursor and selection for %s on both backgrounds', color => {
  const black = buildTerminalTheme('black', color);
  const white = buildTerminalTheme('white', color);
  expect(black.background).toBe('#000000');
  expect(white.background).toBe('#ffffff');
  expect(white.foreground).not.toBe(black.foreground);
  for (const theme of [black, white]) {
    expect(theme.cursor).toBe(theme.foreground);
    expect(theme.white).toBe(theme.foreground);
    expect(theme.brightWhite).toBe(theme.foreground);
    expect(theme.cursorAccent).toBe(theme.background);
  }
  expect(white.yellow).toBe('#7a6200');
});
