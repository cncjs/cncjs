export const DEFAULT_FONT_STACK = 'Consolas, Menlo, Monaco, Lucida Console, Liberation Mono, DejaVu Sans Mono, Bitstream Vera Sans Mono, Courier New, monospace, serif';

export const DEFAULT_FONT_SIZE = 14;
export const FONT_SIZES = Array.from({ length: 24 - 8 + 1 }, (_, index) => 8 + index);

// Terminal size in columns and rows.
export const TERMINAL_COLS = 256;
export const TERMINAL_ROWS = 15;
export const TERMINAL_COLS_MIN = 80;
export const TERMINAL_COLS_MAX = 500;
export const TERMINAL_ROWS_MIN = 5;
export const TERMINAL_ROWS_MAX = 100;

// Terminal colors
export const BACKGROUND_BLACK = 'black';
export const BACKGROUND_WHITE = 'white';
export const DEFAULT_BACKGROUND = BACKGROUND_BLACK;
export const DEFAULT_TEXT_COLOR = 'default';
export const TEXT_COLORS = ['default', 'green', 'amber', 'cyan'];
