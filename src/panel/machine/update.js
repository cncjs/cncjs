/**
 * Whether the panel on screen is still the panel that was served.
 *
 * A pendant is opened once and left open — installed on a phone it may not be
 * reloaded for weeks. So a rebuilt panel sits on the server while the operator
 * looks at an older one, and nothing says so: the service worker is
 * network-first, which keeps the *assets* fresh but cannot swap out the
 * JavaScript already running in the page.
 *
 * Reloading by hand used to be the answer, and it stopped being one when
 * pull-to-refresh was switched off — deliberately, because the same gesture
 * scrolls the settings and opens the menu. That trade is only honest if the
 * panel says when a reload is worth making, which is what this is for.
 */

/*
 * The decision, kept away from the browser so it can be tested.
 *
 * `controllerchange` fires twice in the life of a page for two quite
 * different reasons: once when the very first worker takes over a page that
 * had none, and again whenever a *new* worker replaces it. Only the second is
 * an update. Treating the first as one would show the badge to everybody on
 * their first ever visit, which is the fastest way to teach somebody to
 * ignore it.
 */
export const isUpdate = ({ hadController }) => Boolean(hadController);

/*
 * How often to ask the server whether it has a newer worker.
 *
 * The browser checks on navigation, and a pendant does not navigate. Ten
 * minutes is frequent enough that a rebuild is noticed within one coffee and
 * rare enough to be invisible next to the status reports already flowing.
 */
const CHECK_MS = 10 * 60 * 1000;

let ready = false;
const watchers = new Set();

const tell = () => watchers.forEach((notify) => notify());

/** A newer panel is waiting on the server. Reload to take it. */
export const isUpdateReady = () => ready;

/** Called when that changes. Returns the unsubscribe. */
export const watchUpdate = (notify) => {
  watchers.add(notify);
  return () => watchers.delete(notify);
};

/** Take it. Nothing is lost: the job and the port belong to the server. */
export const applyUpdate = () => window.location.reload();

/*
 * Guarded, because this module is imported by the Jest tier too, where there
 * is no navigator at all — and by a panel served over plain HTTP, where a
 * service worker is not allowed and this is simply a feature that is off.
 */
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  /*
   * Whether a worker is in charge *right now*, kept up to date rather than
   * captured once.
   *
   * Captured once it would be wrong for the ordinary case: a first visit
   * loads uncontrolled, the worker claims the page, and every later swap
   * would still be compared against "there was none at load" and go
   * unreported. So the first claim moves this to true and is not an update;
   * everything after it is.
   */
  let controlled = Boolean(navigator.serviceWorker.controller);

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (isUpdate({ hadController: controlled })) {
      ready = true;
      tell();
    }
    controlled = true;
  });

  navigator.serviceWorker.ready
    .then((registration) => {
      setInterval(() => registration.update().catch(() => undefined), CHECK_MS);
    })
    .catch(() => undefined);
}

export default isUpdateReady;
