import { channelsOf, scrimmed, usableColor } from '../themeColor';

describe('usableColor', () => {
  it('takes a token value as the browser will read it', () => {
    // `getPropertyValue` keeps the whitespace from the stylesheet.
    expect(usableColor(' #ffffff ')).toBe('#ffffff');
  });

  it('refuses nothing rather than blanking the bar', () => {
    // An unset property answers with an empty string, and writing that would
    // hand the status bar back to the system mid-theme-change.
    expect(usableColor('')).toBeNull();
    expect(usableColor(undefined)).toBeNull();
    expect(usableColor('   ')).toBeNull();
  });
});

describe('channelsOf', () => {
  it('reads a token the way the sheet writes it', () => {
    expect(channelsOf('#ffffff')).toEqual([255, 255, 255]);
    expect(channelsOf(' #18222e ')).toEqual([24, 34, 46]);
  });

  it('reads the short form too', () => {
    expect(channelsOf('#abc')).toEqual([170, 187, 204]);
  });

  it('refuses anything it does not understand', () => {
    // The caller falls back to the unmixed colour. A status bar one shade off
    // is a smaller thing than one gone black because a parser guessed.
    expect(channelsOf('rgb(1, 2, 3)')).toBeNull();
    expect(channelsOf('var(--panel)')).toBeNull();
    expect(channelsOf('#12345')).toBeNull();
    expect(channelsOf('')).toBeNull();
  });
});

describe('scrimmed', () => {
  it('lays the ink over the panel in the proportion the token names', () => {
    // Black at 50% over white is the midpoint, and the halves must round the
    // same way in all three channels or the bar comes out tinted.
    expect(scrimmed('#ffffff', '#000000', '50%')).toBe('#808080');
  });

  it('is the panel itself at nothing, and the ink at everything', () => {
    expect(scrimmed('#ffffff', '#18222e', '0%')).toBe('#ffffff');
    expect(scrimmed('#ffffff', '#18222e', '100%')).toBe('#18222e');
  });

  it('dims rather than lightens on the dark theme', () => {
    // The ink is nearly white there, so a naive "mix towards the ink" would
    // have made the status bar brighter when a sheet covered the panel.
    // Measured against the real tokens: #e6ecf3 at 45% over #141a21.
    const dark = scrimmed('#141a21', '#e6ecf3', '45%');
    expect(dark).toBe('#737980');
    expect(channelsOf(dark)[0]).toBeGreaterThan(channelsOf('#141a21')[0]);
  });

  it('answers nothing rather than a colour it had to invent', () => {
    expect(scrimmed('var(--panel)', '#000000', '45%')).toBeNull();
    expect(scrimmed('#ffffff', 'var(--ink)', '45%')).toBeNull();
    expect(scrimmed('#ffffff', '#000000', '')).toBeNull();
    expect(scrimmed('#ffffff', '#000000', '145%')).toBeNull();
  });
});
