/**
 * What is already happening, for a client that has only just arrived.
 *
 * The socket tells you what changes, not what is. `serialport:open` fires when
 * a port is opened and never again, so a page loaded after the machine was
 * connected hears nothing at all and shows "Disconnected" next to a running
 * spindle. That is not a race — it is the protocol, and every client has to
 * ask once on startup.
 *
 * `GET /api/controllers` is the question. It answers with every open port, the
 * firmware on it and its last reported state, which is exactly the shape the
 * socket events then keep up to date.
 *
 * The bearer token is not optional: `src/server/app.js` bypasses JWT
 * verification when NODE_ENV is development, so an unauthenticated request
 * happens to work against a dev server and returns 403 against the production
 * one that actually runs in the garage.
 */
export const fetchOpenController = async (token) => {
  const res = await fetch('/api/controllers', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    throw new Error(`could not read the controller list: ${res.status}`);
  }

  const list = await res.json();
  // More than one port can be open at once. The panel shows one machine, and
  // until there is a way to choose, the first is the one it shows.
  const [first] = Array.isArray(list) ? list : [];

  if (!first) {
    return null;
  }

  return {
    port: first.port,
    type: first.controller?.type || '',
    state: first.controller?.state || {},
    // The firmware's own settings. `$22` is what says whether homing exists
    // on this machine at all, and a homing button that does not know is a
    // button that moves a machine on a guess.
    settings: first.controller?.settings || {},
    // Carried so the panel can attach to the port rather than only read it.
    // See `attach()` in useMachine: knowing what is open is not the same as
    // being connected to it.
    baudrate: first.baudrate,
    rtscts: Boolean(first.rtscts),
  };
};

export default fetchOpenController;
