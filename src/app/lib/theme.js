export const THEMES = ['light', 'dark'];
export const DEFAULT_THEME = 'dark';

export const applyTheme = (theme) => {
  const next = THEMES.includes(theme) ? theme : DEFAULT_THEME;
  THEMES.forEach((t) => {
    document.documentElement.classList.toggle(`theme-${t}`, t === next);
  });
};
