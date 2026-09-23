/**
 * The Android status bar, painted the same colour as whatever is underneath it.
 *
 * Installed, the panel runs in `standalone`, so the system's status bar sits
 * permanently above the panel's own top bar. Android colours it from
 * `<meta name="theme-color">`, of which the page head carries exactly one.
 *
 * That was a pair of tags keyed on `prefers-color-scheme`, which answered the
 * phone's question rather than the panel's -- at the time the panel had no
 * system-following theme at all. It has one now (`ui/theme`), and it works by
 * writing `data-theme`, which is the attribute this module already watched.
 * So the two fit together without either knowing much about the other: the
 * theme decides what the root says, and this reads the colour back out of the
 * token sheet. A browser also uses the *first* matching tag, so a second one
 * added by script could never have corrected the old arrangement anyway.
 *
 * The colour is read from the sheet rather than written down a third time.
 * `--panel` is what the top bar is painted with, whatever decided it.
 *
 * The bar at the *bottom* has no equivalent. Android's navigation bar -- the
 * gesture pill -- is not addressable from a page at all: no manifest field, no
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
 * A token's channels, or nothing.
 *
 * Hex only, which is every colour in `tokens.css`. Anything else answers
 * `null` and the caller falls back to the unmixed colour -- a status bar one
 * shade off is a far smaller thing than one that has gone black because a
 * parser met a format it did not know.
 */
export const channelsOf = (value) => {
  const hex = String(value || '').trim().replace(/^#/, '');
  const full = hex.length === 3 ? hex.replace(/./g, (c) => c + c) : hex;

  if (!/^[0-9a-f]{6}$/i.test(full)) {
    return null;
  }

  return [0, 2, 4].map((at) => parseInt(full.slice(at, at + 2), 16));
};

/**
 * What a scrim leaves of the colour behind it.
 *
 * Plain source-over compositing, and it lives here as arithmetic on two
 * tokens rather than as a third colour written into the sheet by hand. A
 * hand-computed shade is one that silently stops matching the day somebody
 * adjusts `--ink`, and nothing would ever say so -- the status bar would
 * simply be a little wrong above a sheet, which is exactly the class of thing
 * nobody reports.
 *
 * `alpha` arrives as the `--scrimA` token says it, e.g. `45%`.
 */
export const scrimmed = (base, ink, alpha) => {
  const under = channelsOf(base);
  const over = channelsOf(ink);
  const share = parseFloat(String(alpha || '')) / 100;

  if (!under || !over || !(share >= 0 && share <= 1)) {
    return null;
  }

  const mixed = under.map((channel, at) => Math.round((over[at] * share) + (channel * (1 - share))));
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
};

/**
 * How many things are dimming the panel right now.
 *
 * A count rather than a flag, because a sheet can open a sheet: the state
 * chip's help comes up from inside the sheet that offered it, and a flag
 * would hand the bar back to `--panel` when the inner one closed while the
 * outer one was still covering the screen.
 */
let dimming = 0;

/**
 * Put the tag's content where the root says it should be.
 *
 * Exported so the paint can be driven by something other than a mutation --
 * a scrim going up changes nothing about the document's attributes.
 */
export const paintThemeColor = () => {
  if (typeof document === 'undefined') {
    return;
  }

  const style = getComputedStyle(document.documentElement);
  const panel = usableColor(style.getPropertyValue('--panel'));

  if (!panel) {
    return;
  }

  const colour = (dimming > 0 && scrimmed(
    panel,
    style.getPropertyValue('--ink'),
    style.getPropertyValue('--scrimA'),
  )) || panel;

  let meta = document.getElementById(ID);
  if (!meta) {
    meta = document.createElement('meta');
    meta.id = ID;
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', colour);
};

/**
 * Say that something is covering the panel. Returns the way to stop saying it.
 *
 * Shaped for `useEffect(() => dimPanel(), [])`, which is how both callers use
 * it. Opening a sheet dropped a grey scrim over everything and left the status
 * bar intensely white above it -- the one part of the screen the panel had
 * told the system about and then stopped keeping true.
 *
 * **Unverified on an installed panel.** The tag's content is rewritten and the
 * change is immediate in a tab, measured. Whether a WebAPK re-reads it while
 * running is not known, and there is no way to find out from here: it needs
 * the phone. If it does not, this costs nothing and the bar stays as it was.
 */
export const dimPanel = () => {
  dimming += 1;
  paintThemeColor();

  return () => {
    dimming = Math.max(0, dimming - 1);
    paintThemeColor();
  };
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

  paintThemeColor();

  // The theme is written on the root by whatever sets it — `ui/theme` for the
  // setting and the system, or the review overlay flipping it from outside
  // React. Watching the attribute is what makes this work for all of them
  // without any of them knowing this exists. `scene/colors.js` watches the
  // same one for the same reason.
  const observer = new MutationObserver(paintThemeColor);
  observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  return () => observer.disconnect();
};

export default syncThemeColor;
