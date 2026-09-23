/**
 * The Android status bar, painted the same colour as the bar underneath it.
 *
 * Installed, the panel runs in `standalone`, so the system's status bar sits
 * permanently above the panel's own top bar. Android colours it from
 * `<meta name="theme-color">`, of which the page head carries exactly one.
 *
 * That was a pair of tags keyed on `prefers-color-scheme`, and the panel has
 * no such mode: `[data-theme='dark']` in the token sheet is the only thing
 * that switches it. So the pair answered the phone's question rather than the
 * panel's, and on a phone in dark mode the status bar came up dark above a
 * white panel -- measured after a reinstall. A browser also uses the *first*
 * matching tag, so a second one added by script could not have corrected it.
 *
 * So the colour is read from the token sheet rather than written down a third
 * time. `--panel` is what the top bar is painted with, whatever decided it.
 *
 * The bar at the *bottom* has no equivalent. Android's navigation bar — the
 * gesture pill — is not addressable from a page at all: no manifest field, no
 * meta, no CSS. In `standalone` it is outside the application's window
 * entirely, which is the next best thing to controlling it.
 */

/**
 * The meta this module owns, and the only one the page has.
 *
 * It is written into the head rather than created here, so that the colour is
 * right for the instant before the bundle runs. Created as a fallback anyway,
 * because a missing tag should not be a missing status bar colour forever.
 */
const ID = 'theme-color-live';

/**
 * A colour value the browser will accept, or nothing.
 *
 * `getPropertyValue` answers with an empty string for a property that is not
 * set, and assigning that to the meta would leave the bar system-coloured
 * halfway through a theme change rather than at the end of it.
 */
export const usableColor = (value) => {
  const colour = String(value || '').trim();
  return colour || null;
};

/**
 * Keep the tag in step with the root element's theme. Returns the unhook.
 *
 * Guarded for the Jest tier, which has no document.
 */
export const syncThemeColor = () => {
  if (typeof document === 'undefined') {
    return () => undefined;
  }

  const root = document.documentElement;

  const paint = () => {
    const colour = usableColor(getComputedStyle(root).getPropertyValue('--panel'));
    if (!colour) {
      return;
    }

    let meta = document.getElementById(ID);
    if (!meta) {
      meta = document.createElement('meta');
      meta.id = ID;
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', colour);
  };

  paint();

  // The theme is written on the root by whatever sets it — the settings
  // screen, or the review overlay flipping it from outside React. Watching
  // the attribute is what makes this work for both without either knowing
  // this exists. `scene/colors.js` watches the same one for the same reason.
  const observer = new MutationObserver(paint);
  observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  // And the system changing underneath a panel that has no theme of its own.
  const media = window.matchMedia?.('(prefers-color-scheme: dark)');
  media?.addEventListener?.('change', paint);

  return () => {
    observer.disconnect();
    media?.removeEventListener?.('change', paint);
  };
};

export default syncThemeColor;
