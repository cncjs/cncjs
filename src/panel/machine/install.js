/**
 * Whether this browser will install the panel, and the one chance it gives
 * you to ask.
 *
 * A browser decides on its own whether an application may be installed, and
 * it announces the answer exactly once, by firing `beforeinstallprompt` — a
 * page that was not listening when it fired has no way to ask for it later.
 * So the listener is attached at the top of the module rather than by a
 * component: by the time a settings screen is opened the event is long gone.
 *
 * The event object is also single-use. `prompt()` may be called once per
 * event, and the browser fires a fresh one only if the conditions change.
 */
let deferred = null;
let installed = false;
const watchers = new Set();

const tell = () => watchers.forEach((notify) => notify());

/** Ready to be asked. Nothing else makes an install prompt possible. */
export const canInstall = () => Boolean(deferred) && !installed;

/** Already on the home screen, as far as the browser will say. */
export const isInstalled = () => installed;

/**
 * Ask. Resolves to true when the operator accepted.
 *
 * The prompt is dropped afterwards whatever the answer: the event cannot be
 * reused, and a button that stayed lit after being refused would do nothing
 * the second time.
 */
export const promptInstall = async () => {
  if (!deferred) {
    return false;
  }

  const event = deferred;
  deferred = null;
  tell();

  event.prompt();
  const { outcome } = await event.userChoice;

  if (outcome === 'accepted') {
    installed = true;
    tell();
  }

  return outcome === 'accepted';
};

/** Called when any of the above changes. Returns the unsubscribe. */
export const watchInstall = (notify) => {
  watchers.add(notify);
  return () => watchers.delete(notify);
};

/*
 * Guarded, because this module is imported by the Jest tier too, where there
 * is no window at all.
 */
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Without this the browser shows its own bar at its own moment, which on
    // a panel would cover the top of the screen while somebody is jogging.
    event.preventDefault();
    deferred = event;
    tell();
  });

  window.addEventListener('appinstalled', () => {
    installed = true;
    deferred = null;
    tell();
  });

  /*
   * And the case where it was installed before this page loaded: an installed
   * application opens in its own window, which is what `display-mode` reports.
   * `beforeinstallprompt` never fires there, so without this the screen would
   * offer to install something that already is.
   */
  const standalone = window.matchMedia?.('(display-mode: standalone), (display-mode: fullscreen)');
  if (standalone?.matches) {
    installed = true;
  }
}

export default canInstall;
