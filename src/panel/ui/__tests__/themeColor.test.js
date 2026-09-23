import { usableColor } from '../themeColor';

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
