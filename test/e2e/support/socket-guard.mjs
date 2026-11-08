// Install before navigation, with service workers blocked. This guard must be the
// last matching context route, and no page route may handle Socket.IO requests:
// Playwright's continue/fetch/fulfill can bypass earlier route handlers.
// A separate, isolated CNCjs backend with safe event configuration is required:
// simulator open/close can run backend triggers and commands can have side effects.
const isSocketPath = url => url.pathname === '/socket.io' || url.pathname.startsWith('/socket.io/');
const loopback = new Set(['localhost', '127.0.0.1', '[::1]']);
const decoder = new TextDecoder('utf-8', { fatal: true });

function socketOrigin(url) {
  const origin = new URL(url);
  if (origin.protocol === 'ws:') {
    origin.protocol = 'http:';
  }
  if (origin.protocol === 'wss:') {
    origin.protocol = 'https:';
  }
  return origin.origin;
}

function validTransport(url, transport) {
  return url.searchParams.getAll('EIO').length === 1 && url.searchParams.get('EIO') === '3' &&
    url.searchParams.getAll('transport').length === 1 && url.searchParams.get('transport') === transport &&
    !url.searchParams.has('j');
}

function pollingPackets(bytes) {
  if (!bytes) {
    throw new Error('missing polling body');
  }
  const body = decoder.decode(bytes);
  const packets = [];
  let index = 0;
  while (index < body.length) {
    const separator = body.indexOf(':', index);
    if (separator < 0) {
      throw new Error('invalid polling frame');
    }
    const length = body.slice(index, separator);
    if (!/^[1-9][0-9]*$/.test(length)) {
      throw new Error('invalid polling length');
    }
    const size = Number(length);
    const start = separator + 1;
    if (!Number.isSafeInteger(size) || size > body.length - start) {
      throw new Error('truncated polling frame');
    }
    packets.push(body.slice(start, start + size));
    index = start + size;
  }
  if (!packets.length) {
    throw new Error('empty polling body');
  }
  return packets;
}

function allowedPacket(packet, simulator) {
  // Engine.IO 3 control packets. Socket.IO is carried only by message packets.
  if (['1', '2', '2probe', '3', '3probe', '5', '6'].includes(packet)) {
    return true;
  }
  if (packet === '40' || packet === '41') {
    return true;
  }
  if (!packet.startsWith('42')) {
    return false;
  }
  const match = /^42[0-9]*(\[.*\])$/.exec(packet);
  if (!match) {
    return false;
  }
  let args;
  try {
    args = JSON.parse(match[1]);
  } catch {
    return false;
  }
  if (!Array.isArray(args) || typeof args[0] !== 'string') {
    return false;
  }
  const [event, ...values] = args;
  if (event === 'getPorts' || event === 'getBaudRates') {
    return values.length === 0;
  }
  if (!simulator) {
    return false;
  }
  if (event === 'open') {
    const [controller, type, options] = values;
    return values.length === 3 && controller === 'Grbl' && type === 'socket' &&
      options !== null && typeof options === 'object' && !Array.isArray(options) &&
      Object.keys(options).length === 2 && options.host === '127.0.0.1' && options.port === simulator.port;
  }
  if (values[0] !== simulator.ident) {
    return false;
  }
  if (event === 'close') {
    return values.length === 1;
  }
  if (event === 'command') {
    return typeof values[1] === 'string' && simulator.commands.has(values[1]);
  }
  return event === 'write' || event === 'writeln';
}

/**
 * Install a context-wide Socket.IO 2 / Engine.IO 3 guard for CNCjs's default path.
 *
 * The returned violations array contains categories only, never payloads or URLs.
 * Call assertSafe() after the page is closed and route handlers have drained.
 * approveSimulator({ port, commands }) is only for a currently running, test-owned
 * 127.0.0.1 simulator on an isolated backend. Keep it alive until after close,
 * then revokeSimulator(); commands is an explicit allowlist of command names.
 * usePollingProxy(server) selects an already-listening, test-owned HTTP fixture
 * bound to 127.0.0.1; it removes the token and proxies polling to that server.
 * Proxy mode must be set before opening the page and cannot be mixed with a
 * simulator. WebSockets are closed in proxy mode so Engine.IO can use polling.
 * These approvals are caller assertions, not proof of server/process ownership.
 */
export async function installSocketGuard(context, baseURL) {
  const backend = new URL(baseURL);
  if (!['http:', 'https:'].includes(backend.protocol) || !loopback.has(backend.hostname)) {
    throw new Error('Socket guard requires a loopback CNCjs backend.');
  }
  const violations = [];
  let simulator = null;
  let proxy = null;
  let started = false;

  const fail = reason => {
    violations.push(reason);
  };
  const handlePolling = async route => {
    started = true;
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== backend.origin || !validTransport(url, 'polling') || !['GET', 'POST'].includes(request.method())) {
      fail('unsupported Socket.IO polling request');
      return route.abort('blockedbyclient');
    }
    if (proxy) {
      // Resolve the target on every request so a closed/replaced listener fails closed.
      const address = proxy.address();
      if (!address || typeof address === 'string' || address.address !== '127.0.0.1' || address.port !== proxy.port) {
        fail('polling fixture is not listening on its approved address');
        return route.abort('blockedbyclient');
      }
      url.protocol = 'http:';
      url.hostname = '127.0.0.1';
      url.port = String(address.port);
      url.searchParams.delete('token');
      const response = await route.fetch({ url: url.toString(), maxRedirects: 0 });
      if (response.status() >= 300 && response.status() < 400) {
        fail('blocked polling fixture redirect');
        return route.abort('blockedbyclient');
      }
      return route.fulfill({ response });
    }
    if (request.method() === 'POST') {
      if (request.headers()['content-type'] === 'application/octet-stream') {
        fail('blocked binary Socket.IO polling packet');
        return route.abort('blockedbyclient');
      }
      try {
        if (!pollingPackets(request.postDataBuffer()).every(packet => allowedPacket(packet, simulator))) {
          throw new Error('unapproved packet');
        }
      } catch {
        fail('blocked Socket.IO polling packet');
        return route.abort('blockedbyclient');
      }
    }
    return route.continue();
  };
  await context.route(isSocketPath, handlePolling);
  await context.routeWebSocket(isSocketPath, ws => {
    started = true;
    const url = new URL(ws.url());
    if (socketOrigin(url) !== backend.origin || !validTransport(url, 'websocket')) {
      fail('unsupported Socket.IO WebSocket');
      return ws.close();
    }
    if (proxy) {
      return ws.close();
    }
    const server = ws.connectToServer();
    ws.onMessage(message => {
      if (typeof message !== 'string' || !allowedPacket(message, simulator)) {
        fail('blocked Socket.IO WebSocket packet');
        ws.close();
        return;
      }
      server.send(message);
    });
    return undefined;
  });

  return {
    violations,
    approveSimulator({ port, commands = [] }) {
      if (proxy || simulator || !Number.isInteger(port) || port < 1 || port > 65535 ||
          !Array.isArray(commands) || commands.some(command => typeof command !== 'string' || !command)) {
        throw new Error('Invalid simulator approval.');
      }
      simulator = {
        port,
        ident: Buffer.from(`socket|127.0.0.1:${port}`).toString('hex'),
        commands: new Set(commands),
      };
    },
    revokeSimulator() {
      simulator = null;
    },
    usePollingProxy(server) {
      if (started || simulator || proxy || !server || typeof server.address !== 'function') {
        throw new Error('Polling fixture must be selected before Socket.IO traffic.');
      }
      const address = server.address();
      if (!address || typeof address === 'string' || address.address !== '127.0.0.1' || !address.port) {
        throw new Error('Polling fixture must be listening on 127.0.0.1.');
      }
      proxy = { address: () => server.address(), port: address.port };
    },
    assertSafe() {
      if (violations.length) {
        throw new Error(`Socket.IO safety violations: ${violations.join(', ')}`);
      }
    },
  };
}
