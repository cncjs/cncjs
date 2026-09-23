import { THEMES, normalizePreference, themeFor } from '../theme';

describe('normalizePreference', () => {
  it('keeps the three the setting can be', () => {
    THEMES.forEach((theme) => expect(normalizePreference(theme)).toBe(theme));
  });

  it('falls back to following the system', () => {
    // Anything at all: an empty store, a value from an older build, a typo
    // somebody put in by hand. Following the phone is the safe answer because
    // it is the one that cannot be wrong about what the operator wanted.
    expect(normalizePreference(null)).toBe('system');
    expect(normalizePreference(undefined)).toBe('system');
    expect(normalizePreference('')).toBe('system');
    expect(normalizePreference('sepia')).toBe('system');
  });
});

describe('themeFor', () => {
  it('follows the phone when nothing overrides it', () => {
    expect(themeFor('system', true)).toBe('dark');
    expect(themeFor('system', false)).toBe('light');
  });

  it('ignores the phone when something does', () => {
    // The whole point of the override: a dark phone in a bright workshop
    // still gets the light panel if that is what was asked for.
    expect(themeFor('light', true)).toBe('light');
    expect(themeFor('dark', false)).toBe('dark');
  });

  it('never answers with `system`', () => {
    // `data-theme` is read by the token sheet, by `ui/themeColor` for the
    // status bar and by `scene/colors` for the 3D view. None of them know
    // what `system` would mean, so it must not reach the attribute.
    THEMES.forEach((theme) => {
      expect(['light', 'dark']).toContain(themeFor(theme, true));
      expect(['light', 'dark']).toContain(themeFor(theme, false));
    });
  });
});
