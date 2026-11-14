export const FONT_SIZE_LARGE = 'large';
export const FONT_SIZE_MEDIUM = 'medium';
export const FONT_SIZE_SMALL = 'small';
export const DEFAULT_FONT_SIZE = FONT_SIZE_MEDIUM;

// Pixel sizes. "large" must equal xterm's default so existing behavior is unchanged.
export const FONT_SIZE_PX = {
  [FONT_SIZE_LARGE]: 15,
  [FONT_SIZE_MEDIUM]: 13,
  [FONT_SIZE_SMALL]: 11
};

// Terminal size (the buffer starts with 254 bytes free; the terminating <LF> or <CR> counts as a byte)
export const TERMINAL_COLS = 254;
export const TERMINAL_ROWS = 15;
export const TERMINAL_COLS_MIN = 40;
export const TERMINAL_COLS_MAX = 500;
export const TERMINAL_ROWS_MIN = 5;
export const TERMINAL_ROWS_MAX = 100;

// Terminal colors
export const BACKGROUND_DARK = 'dark';
export const BACKGROUND_LIGHT = 'light';
export const DEFAULT_BACKGROUND = BACKGROUND_DARK;
export const DEFAULT_TEXT_COLOR = 'default';
export const DEFAULT_CURSOR_COLOR = 'default';
export const TEXT_COLORS = ['default', 'green', 'amber', 'cyan'];
export const CURSOR_COLORS = ['default', 'green', 'amber', 'cyan', 'red'];
