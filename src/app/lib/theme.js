export const COLOR_MODES = ['light', 'dark'];
export const DEFAULT_COLOR_MODE = 'light';

export const normalizeColorMode = (colorMode) => (COLOR_MODES.includes(colorMode) ? colorMode : DEFAULT_COLOR_MODE);

export const applyColorMode = (colorMode) => {
  document.documentElement.setAttribute('data-color-mode', normalizeColorMode(colorMode));
};

// Shared by startup (token sign-in) and Login (interactive sign-in): res is the api.getState() response
export const applyColorModeFromState = (res) => {
  applyColorMode(res && res.body ? res.body.colorMode : undefined);
};
