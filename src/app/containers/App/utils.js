const matchMediaQuery = (query) => {
  const mediaQueryList = window?.matchMedia?.(query);
  if (!mediaQueryList) {
    return undefined;
  }
  return mediaQueryList.matches;
};

const colorSchemeQuery = {
  dark: '(prefers-color-scheme: dark)',
  light: '(prefers-color-scheme: light)',
};

export const ensureColorMode = (colorMode) => {
  return colorMode === 'dark' ? 'dark' : 'light';
};

export const getColorScheme = (fallbackColorMode) => {
  const isDarkColorScheme = matchMediaQuery(colorSchemeQuery.dark) ?? (fallbackColorMode === 'dark');
  return isDarkColorScheme ? 'dark' : 'light';
};

export const mapDisplayLanguageToLocaleString = (language) => ({
  'cs': 'Čeština',
  'de': 'Deutsch',
  'en': 'English (US)',
  'es': 'Español',
  'fr': 'Français (France)',
  'it': 'Italiano',
  'ja': '日本語',
  'hu': 'Magyar',
  'nb': 'Norwegian',
  'nl': 'Nederlands',
  'pt': 'Português (Portugal)',
  'pt-br': 'Português (Brasil)',
  'ru': 'Русский',
  'tr': 'Türkçe',
  'zh-cn': '中文 (简体)',
  'zh-tw': '中文 (繁體)',
}[language]);
