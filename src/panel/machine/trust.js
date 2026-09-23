/**
 * Why this device will not install the panel as an application.
 *
 * A pendant is meant to live on a phone's home screen, and a browser refuses
 * that unless the page is a *secure context*. When it refuses it says so
 * nowhere the operator will look: the menu item reads "cannot install this
 * application" with no reason, and the padlock is struck through three taps
 * away. It cost an afternoon to find that the certificate named one host and
 * the phone was reaching another.
 *
 * So the panel says it itself, on the screen where the connection lives. Two
 * different problems with two different answers:
 *
 * - **served over plain HTTP** — no certificate helps; the server has to be
 *   started with one. `scripts/serve-panel.sh` does that.
 * - **served over HTTPS this device does not trust** — the authority that
 *   signed it is not in this device's store, and installing it is a thing the
 *   operator can do from the application settings, where the certificate now
 *   sits whether or not anything is wrong with it.
 *
 * Note that *clicking through* a certificate warning does not fix the second
 * one. The page loads and the origin stays insecure, which is why the panel
 * can be sitting there working while refusing to be installed.
 *
 * Returns null when there is nothing wrong, which is the ordinary case.
 */
export const trustState = ({ protocol, secure } = {}) => {
  if (secure) {
    return null;
  }

  return protocol === 'https:'
    ? { key: 'connect.trust.untrusted' }
    : { key: 'connect.trust.insecure' };
};

export default trustState;
