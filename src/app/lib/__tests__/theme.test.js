/* eslint-env jest */
import { DEFAULT_COLOR_MODE, COLOR_MODES, applyColorMode, applyColorModeFromState, normalizeColorMode } from '../theme';

const installDocument = () => {
  const attributes = new Map();
  global.document = {
    documentElement: {
      setAttribute: (name, value) => attributes.set(name, value)
    }
  };
  return attributes;
};

afterEach(() => {
  delete global.document;
});

describe('color mode', () => {
  test('Light is the default and both color modes are known', () => {
    expect(DEFAULT_COLOR_MODE).toBe('light');
    expect(COLOR_MODES).toEqual(['light', 'dark']);
  });

  test.each([[undefined], [null], [''], ['purple'], [42]])('normalizeColorMode(%p) falls back to light', (value) => {
    expect(normalizeColorMode(value)).toBe('light');
  });

  test.each([['light'], ['dark']])('normalizeColorMode keeps %s', (value) => {
    expect(normalizeColorMode(value)).toBe(value);
  });

  test('applyColorMode sets and replaces the root color mode attribute', () => {
    const attributes = installDocument();
    applyColorMode('dark');
    expect(attributes.get('data-color-mode')).toBe('dark');
    applyColorMode('light');
    expect(attributes.get('data-color-mode')).toBe('light');
  });

  test('applyColorMode with no or an invalid value applies the default', () => {
    const attributes = installDocument();
    applyColorMode('dark');
    applyColorMode('bogus');
    expect(attributes.get('data-color-mode')).toBe('light');
    applyColorMode();
    expect(attributes.get('data-color-mode')).toBe('light');
  });

  // Startup (token sign-in) and Login (interactive sign-in) both call applyColorModeFromState(res)
  test.each([
    [{ body: { colorMode: 'dark' } }, 'dark'],
    [{ body: { colorMode: 'light' } }, 'light'],
    [{ body: { colorMode: 'bogus' } }, 'light'],
    [{ body: {} }, 'light'],
    [{}, 'light'],
    [undefined, 'light']
  ])('applyColorModeFromState(%j)', (res, expected) => {
    const attributes = installDocument();
    applyColorModeFromState(res);
    expect(attributes.get('data-color-mode')).toBe(expected);
  });
});
