import Store from 'electron-store';

const store = new Store();
const KEY = 'serverUrl';

/**
 * Where the window should get its content from.
 *
 * With nothing configured the app behaves as it always has: it starts its own
 * server on a random loopback port and loads that. Configure a URL and it
 * becomes a client for a server running elsewhere — typically a machine that
 * physically holds the controller — and starts no server of its own.
 *
 * The distinction matters beyond convenience: only one process can hold a
 * serial port, so a second instance starting its own server next to the real
 * one is not a second view of the machine, it is a competitor for it.
 */

const normalize = (value) => {
  const raw = String(value || '').trim();
  if (!raw) {
    return null;
  }

  // Accept "192.168.0.50:8000" as well as a full URL; a bare host is what
  // someone types when they are reading an address off a router.
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;

  try {
    const url = new URL(withScheme);
    if (!url.hostname) {
      return null;
    }
    // Trailing slashes and stray paths only confuse the comparison later.
    return `${url.protocol}//${url.host}`;
  } catch (e) {
    return null;
  }
};

/**
 * Reads `--server-url=<value>` / `--server-url <value>` from argv.
 * A packaged app has no shell to export variables into, so the flag is how a
 * shortcut or a launcher pins an instance to one server.
 */
const parseArgv = (argv) => {
  const args = Array.isArray(argv) ? argv : [];

  for (let i = 0; i < args.length; ++i) {
    const arg = String(args[i]);

    if (arg.startsWith('--server-url=')) {
      return arg.slice('--server-url='.length);
    }
    if (arg === '--server-url' && i + 1 < args.length) {
      return args[i + 1];
    }
  }

  return null;
};

export const getServerUrl = () => normalize(store.get(KEY));

export const setServerUrl = (value) => {
  const url = normalize(value);
  if (url) {
    store.set(KEY, url);
  } else {
    store.delete(KEY);
  }
  return url;
};

export const clearServerUrl = () => {
  store.delete(KEY);
};

/**
 * Resolves the server for this launch, letting an explicit flag win over — and
 * update — whatever was stored. Returns null for "run the embedded server".
 */
export const resolveServerUrl = (argv) => {
  const fromArgv = parseArgv(argv);

  if (fromArgv !== null) {
    // An empty value is a deliberate "go back to the local server".
    return setServerUrl(fromArgv);
  }

  return getServerUrl();
};

export { normalize as normalizeServerUrl };
