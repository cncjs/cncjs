// A forced reload (reload(true)) bypasses service worker interception in Firefox, so the
// offline page would not be served. Use a normal reload when a worker controls the page.
export const isControlledByServiceWorker = () => !!(
  typeof navigator !== 'undefined' && navigator.serviceWorker && navigator.serviceWorker.controller
);

export const reloadPage = () => {
  window.location.reload(!isControlledByServiceWorker());
};
