export const THEMES = ['light', 'dark'];
export const DEFAULT_THEME = 'light';

export const normalizeTheme = (theme) => (THEMES.includes(theme) ? theme : DEFAULT_THEME);

export const applyTheme = (theme) => {
  const next = normalizeTheme(theme);
  THEMES.forEach((t) => {
    document.documentElement.classList.toggle(`theme-${t}`, t === next);
  });
};

// Shared by startup (token sign-in) and Login (interactive sign-in): res is the api.getState() response
export const applyThemeFromState = (res) => {
  applyTheme(res && res.body ? res.body.theme : undefined);
};
