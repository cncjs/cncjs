import {
  BACKGROUND_BLACK, BACKGROUND_WHITE, DEFAULT_BACKGROUND, DEFAULT_FONT_SIZE,
  DEFAULT_TEXT_COLOR, FONT_SIZES, TERMINAL_COLS, TERMINAL_COLS_MIN, TERMINAL_COLS_MAX,
  TERMINAL_ROWS, TERMINAL_ROWS_MIN, TERMINAL_ROWS_MAX, TEXT_COLORS,
} from './constants';

const clamp = (value, min, max, fallback) => (
  Number.isInteger(Number(value)) ? Math.max(min, Math.min(max, Number(value))) : fallback
);

export const normalizeConsoleColors = (config) => {
  if (config.terminalBackground === 'dark') {
    config.terminalBackground = BACKGROUND_BLACK;
  } else if (config.terminalBackground === 'light') {
    config.terminalBackground = BACKGROUND_WHITE;
  }
  delete config.terminalCursorColor;
};

export const readConsoleSettings = (get) => ({
  fontSize: FONT_SIZES.includes(get('fontSize')) ? get('fontSize') : DEFAULT_FONT_SIZE,
  cols: clamp(get('terminalCols'), TERMINAL_COLS_MIN, TERMINAL_COLS_MAX, TERMINAL_COLS),
  rows: clamp(get('terminalRows'), TERMINAL_ROWS_MIN, TERMINAL_ROWS_MAX, TERMINAL_ROWS),
  background: ['white', 'light'].includes(get('terminalBackground')) ? BACKGROUND_WHITE : DEFAULT_BACKGROUND,
  textColor: TEXT_COLORS.includes(get('terminalTextColor')) ? get('terminalTextColor') : DEFAULT_TEXT_COLOR,
});
