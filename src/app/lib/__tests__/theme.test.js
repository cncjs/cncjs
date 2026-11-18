/* eslint-env jest */
import { DEFAULT_THEME, THEMES, applyTheme, applyThemeFromState, normalizeTheme } from '../theme';

const installDocument = () => {
  const classes = new Set();
  global.document = {
    documentElement: {
      classList: {
        toggle: (name, force) => (force ? classes.add(name) : classes.delete(name)),
        contains: (name) => classes.has(name)
      }
    }
  };
  return classes;
};

afterEach(() => {
  delete global.document;
});

describe('theme', () => {
  test('Light is the default and both themes are known', () => {
    expect(DEFAULT_THEME).toBe('light');
    expect(THEMES).toEqual(['light', 'dark']);
  });

  test.each([[undefined], [null], [''], ['purple'], [42]])('normalizeTheme(%p) falls back to light', (value) => {
    expect(normalizeTheme(value)).toBe('light');
  });

  test.each([['light'], ['dark']])('normalizeTheme keeps %s', (value) => {
    expect(normalizeTheme(value)).toBe(value);
  });

  test('applyTheme sets exactly one theme class and replaces the previous one', () => {
    const classes = installDocument();
    applyTheme('dark');
    expect([...classes]).toEqual(['theme-dark']);
    applyTheme('light');
    expect([...classes]).toEqual(['theme-light']);
  });

  test('applyTheme with no or an invalid value applies the default', () => {
    const classes = installDocument();
    applyTheme('dark');
    applyTheme('bogus');
    expect([...classes]).toEqual(['theme-light']);
    applyTheme();
    expect([...classes]).toEqual(['theme-light']);
  });

  // Startup (token sign-in) and Login (interactive sign-in) both call applyThemeFromState(res)
  test.each([
    [{ body: { theme: 'dark' } }, 'theme-dark'],
    [{ body: { theme: 'light' } }, 'theme-light'],
    [{ body: { theme: 'bogus' } }, 'theme-light'],
    [{ body: {} }, 'theme-light'],
    [{}, 'theme-light'],
    [undefined, 'theme-light']
  ])('applyThemeFromState(%j)', (res, expected) => {
    const classes = installDocument();
    applyThemeFromState(res);
    expect([...classes]).toEqual([expected]);
  });
});
