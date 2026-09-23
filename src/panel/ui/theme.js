/**
 * Which theme the panel wears, and who decides.
 *
 * The panel had a dark theme and nothing that ever asked for it:
 * `[data-theme='dark']` in the token sheet was the only switch, and no code
 * wrote that attribute. A phone in dark mode got a white pendant -- not a
 * flash before the bundle, a permanent state.
 *
 * So: follow the system by default, and let the setting override it. Three
 * values, and `system` is one of them because "follow the phone" is a choice
 * somebody can come back to after trying the other two.
 *
 * **`system` writes the attribute too, and that is the whole point.**
 *
 * It would be shorter to leave `data-theme` off under `system` and let a
 * `prefers-color-scheme` block in the token sheet answer. It would also be
 * wrong, because two things here read the attribute and neither can read a
 * media query:
 *
 *   - `ui/themeColor` paints the Android status bar from `--panel` and
 *     watches `data-theme` to know when to repaint.
 *   - `scene/colors` takes every colour in the 3D view from the same sheet
 *     and watches the same attribute.
 *
 * A panel that went dark by CSS alone would have kept a white status bar
 * above it and a light-theme scene inside it. The attribute is therefore
 * always `light` or `dark` and never absent, and `system` is a *source* for
 * it rather than a third thing it can say.
 */

/** The three the setting can be. `system` is a source, not a look. */
export const THEMES = ['system', 'light', 'dark'];

/**
 * Where the override lives between sessions.
 *
 * Stored, unlike the language -- which `i18n/index.js` deliberately does not
 * cache, and for a reason that does not apply here: a language is *detected*
 * from the browser and a cached one would answer a question nobody asked. A
 * theme override is the opposite. Somebody chose it, and a setting that
 * forgets on reload is not a setting.
 */
const KEY = 'panel.theme';

/** Anything at all, read as one of the three. */
export const normalizePreference = (value) => (
  THEMES.includes(value) ? value : 'system'
);

/**
 * The look the attribute should carry, given the setting and the phone.
 *
 * Pure, and takes the phone's answer rather than asking for it, because this
 * is the part worth testing and the Jest tier has no `window` to ask.
 */
export const themeFor = (preference, prefersDark) => {
  const wanted = normalizePreference(preference);
  return wanted === 'system' ? (prefersDark ? 'dark' : 'light') : wanted;
};

/**
 * Storage, or nothing.
 *
 * Private browsing on iOS throws from `localStorage` rather than returning
 * null, and a pendant that will not boot because it could not remember a
 * colour is a worse panel than one that forgets.
 */
const storage = () => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch (e) {
    return null;
  }
};

export const readPreference = () => {
  try {
    return normalizePreference(storage()?.getItem(KEY));
  } catch (e) {
    return 'system';
  }
};

const save = (preference) => {
  try {
    storage()?.setItem(KEY, preference);
  } catch (e) {
    // Remembered for this session and no further. Nothing else to do.
  }
};

const query = () => (
  typeof window === 'undefined'
    ? null
    : window.matchMedia?.('(prefers-color-scheme: dark)') || null
);

/** Write the look onto the root, where the token sheet and both watchers see it. */
const paint = (preference) => {
  if (typeof document === 'undefined') {
    return;
  }
  document.documentElement.dataset.theme = themeFor(preference, Boolean(query()?.matches));
};

const listeners = new Set();

/** The setting changed. Apply it, keep it, and tell the screen showing it. */
export const setPreference = (value) => {
  const preference = normalizePreference(value);
  save(preference);
  paint(preference);
  listeners.forEach((listener) => listener(preference));
};

/** Subscribe to the setting. Returns the unhook, like the other watchers here. */
export const watchTheme = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/**
 * Apply what is remembered, and keep following the system while it is asked for.
 *
 * Called from `index.jsx` before React mounts. There is no flash to avoid:
 * the body holds an empty div until the bundle runs, so nothing is painted in
 * the wrong theme -- only the status bar, which `index.html` already carries
 * a light value for and which `ui/themeColor` corrects a moment later.
 */
export const startTheme = () => {
  paint(readPreference());

  const media = query();
  const follow = () => {
    // Only `system` cares. Repainting under an override would undo it every
    // time the phone crossed sunset.
    if (readPreference() === 'system') {
      paint('system');
    }
  };

  media?.addEventListener?.('change', follow);
  return () => media?.removeEventListener?.('change', follow);
};

export default startTheme;
