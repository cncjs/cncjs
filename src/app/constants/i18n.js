export const SUPPORTED_LANGUAGES = [
  { value: 'cs', label: 'Čeština' },
  { value: 'de', label: 'Deutsch' },
  { value: 'en', label: 'English (US)' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'hu', label: 'Magyar' },
  { value: 'it', label: 'Italiano' },
  { value: 'ja', label: '日本語' },
  { value: 'nb', label: 'Norwegian' },
  { value: 'nl', label: 'Nederlands' },
  { value: 'pt', label: 'Português (Portugal)' }, // European Portuguese
  { value: 'pt-br', label: 'Português (Brasil)' }, // Brazilian Portuguese
  { value: 'ru', label: 'Русский' },
  { value: 'tr', label: 'Türkçe' },
  { value: 'uk', label: 'українська' },
  { value: 'zh-cn', label: '中文 (简体)' },
  { value: 'zh-tw', label: '中文 (繁體)' }
].sort((a, b) => {
  const bottomHalfLanguages = new Set(['ja', 'zh-cn', 'zh-tw']);

  const priorityA = bottomHalfLanguages.has(a.value) ? 1 : 0;
  const priorityB = bottomHalfLanguages.has(b.value) ? 1 : 0;

  // If both items are in the priority list, keep their original order
  if (priorityA === priorityB) {
    return a.label.localeCompare(b.label);
  }

  // If only one item is in the priority list, prioritize the other
  return priorityA - priorityB;
});
