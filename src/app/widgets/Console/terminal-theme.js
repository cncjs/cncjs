import { BACKGROUND_WHITE } from './constants';

// Each pair is [black background, white background]
const BACKGROUND = ['#000000', '#ffffff'];
const SELECTION = ['rgba(255, 255, 255, 0.3)', 'rgba(0, 0, 0, 0.25)'];
const TEXT = {
  default: ['#ffffff', '#333333'],
  green: ['#33ff33', '#0a7d0a'],
  amber: ['#ffb000', '#9a6700'],
  cyan: ['#00e5ff', '#006f85']
};

// xterm's default yellows and bright colors are unreadable on white
const WHITE_BACKGROUND_PALETTE = {
  black: '#000000',
  red: '#cd3131',
  green: '#00bc00',
  yellow: '#7a6200',
  blue: '#0451a5',
  magenta: '#bc05bc',
  cyan: '#0598bc',
  brightBlack: '#666666',
  brightRed: '#cd3131',
  brightGreen: '#14ce14',
  brightYellow: '#8a6d00',
  brightBlue: '#0451a5',
  brightMagenta: '#bc05bc',
  brightCyan: '#0598bc'
};

export const buildTerminalTheme = (background, textColor) => {
  const i = (background === BACKGROUND_WHITE) ? 1 : 0;
  const foreground = (TEXT[textColor] || TEXT.default)[i];

  return {
    ...(i === 1 ? WHITE_BACKGROUND_PALETTE : {}),
    background: BACKGROUND[i],
    foreground,
    cursor: foreground,
    cursorAccent: BACKGROUND[i],
    selection: SELECTION[i],
    // The console writes its normal text with ANSI "white" (chalk.white)
    white: foreground,
    brightWhite: foreground
  };
};
