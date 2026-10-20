// NDJSON state stream for the touch interface: one authenticated, bounded HTTP
// response per client. It never joins a controller socket and never sends
// G-code; it only publishes job-service snapshots.
import crypto from 'crypto';
import { performance } from 'perf_hooks';

export const VERSION = '3.0.0';

// Concurrent event streams accepted by one server.
export const MAX_CLIENTS = 8;

// A response is rotated (closed with `{rotate: true}`) once it has lived this
// long or carried this many bytes, so a stream never grows without bound.
const MAX_CLIENT_LIFETIME_MS = 60000;
const MAX_CLIENT_BYTES = 512 * 1024;
// Rotating revokes the confirmations issued to that stream: wait for a pending
// one (15 s at most) unless the response is far past its limits.
const ROTATION_GRACE_MS = 20000;
const MAX_GRACE_BYTES = 1024 * 1024;

// Status reports arrive in bursts; publish at most once per coalescing window.
const COALESCE_MS = 150;
const HEARTBEAT_MS = 1000;

// Timestamps change on every snapshot and must not count as a state change.
const VOLATILE_KEYS = ['statusAgeMs', 'statusObservedAt', 'ageMs', 'observedAt'];

export const createStream = (service, options = {}) => {
  // sentAt is a wall-clock time; lifetimes and the heartbeat are durations,
  // measured on a monotonic clock unless the tests inject one.
  const clock = options.clock || Date.now;
  const elapsed = options.clock || (() => performance.now());
  const timers = options.timers || { setInterval, clearInterval, setTimeout, clearTimeout };
  const clients = new Set();
  const epoch = crypto.randomBytes(12).toString('hex');
  let sequence = 0;
  let scheduled = null;
  let disposed = false;
  let lastSignature = '';
  let lastPublished = 0;
  let lastKey = null;

  const snapshot = () => ({
    version: 1,
    epoch,
    sequence: ++sequence,
    sentAt: clock(),
    controllers: service.list()
  });

  const send = (client, packet) => {
    if (client.closed) {
      return;
    }
    try {
      const line = JSON.stringify({ ...packet, transportId: client.id }) + '\n';
      client.bytes += Buffer.byteLength(line);
      const age = elapsed() - client.started;
      if (client.bytes > MAX_CLIENT_BYTES || age >= MAX_CLIENT_LIFETIME_MS) {
        const waiting = typeof service.ticketPending === 'function' && service.ticketPending(client.id);
        if (!waiting || client.bytes > MAX_GRACE_BYTES || age >= MAX_CLIENT_LIFETIME_MS + ROTATION_GRACE_MS) {
          client.close(true);
          return;
        }
      }
      if (client.res.write(line) === false) {
        client.close();
        return;
      }
      if (typeof client.res.flush === 'function') {
        client.res.flush();
      }
    } catch (err) {
      client.close();
    }
  };

  const publish = () => {
    if (disposed || !clients.size) {
      return;
    }
    if (scheduled !== null) {
      timers.clearTimeout(scheduled);
      scheduled = null;
    }
    try {
      // At rest Grbl repeats the same report 4x/s: skip building a snapshot
      // that could only be dropped as a duplicate until the next heartbeat.
      const key = typeof service.fingerprint === 'function' ? service.fingerprint() : null;
      if (key !== null && key === lastKey && elapsed() - lastPublished < HEARTBEAT_MS) {
        return;
      }
      lastKey = key;
      const packet = snapshot();
      const signature = JSON.stringify(packet.controllers, (key, value) => {
        return VOLATILE_KEYS.includes(key) ? undefined : value;
      });
      if (signature === lastSignature && elapsed() - lastPublished < HEARTBEAT_MS) {
        return;
      }
      lastSignature = signature;
      lastPublished = elapsed();
      clients.forEach((client) => send(client, packet));
    } catch (err) {
      Array.from(clients).forEach((client) => client.close());
    }
  };

  // Raw reports trigger a coalesced snapshot; the heartbeat also discovers
  // registry changes and expires stale reports. A heartbeat never modifies
  // the raw report timestamps.
  const unsubscribe = service.subscribe(() => {
    if (clients.size && scheduled === null && !disposed) {
      scheduled = timers.setTimeout(() => {
        scheduled = null;
        publish();
      }, COALESCE_MS);
    }
  });
  const heartbeat = timers.setInterval(publish, HEARTBEAT_MS);
  // Connected clients keep the process alive on their own; an idle heartbeat
  // must not hold the event loop open once the server has been closed.
  if (heartbeat && typeof heartbeat.unref === 'function') {
    heartbeat.unref();
  }

  // Turns `res` into an NDJSON event stream for `req`. Returns false, without
  // touching the response, when another client cannot be accepted.
  const open = (req, res) => {
    if (disposed || clients.size >= MAX_CLIENTS) {
      return false;
    }

    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    const client = {
      res,
      id: crypto.randomBytes(16).toString('hex'),
      started: elapsed(),
      bytes: 0,
      closed: false
    };
    const onClose = () => client.close();
    client.close = (rotate) => {
      if (client.closed) {
        return;
      }
      client.closed = true;
      clients.delete(client);
      service.closeTransport(client.id);
      res.removeListener('close', onClose);
      req.removeListener('aborted', onClose);
      if (rotate && !res.destroyed) {
        res.write(JSON.stringify({ rotate: true }) + '\n');
      }
      res.end();
    };
    res.on('close', onClose);
    req.on('aborted', onClose);

    service.openTransport(client.id);
    clients.add(client);
    try {
      send(client, snapshot());
    } catch (err) {
      client.close();
    }
    return true;
  };

  const dispose = () => {
    if (disposed) {
      return;
    }
    disposed = true;
    unsubscribe();
    timers.clearInterval(heartbeat);
    if (scheduled !== null) {
      timers.clearTimeout(scheduled);
    }
    Array.from(clients).forEach((client) => client.close());
    service.dispose();
  };

  return { version: VERSION, snapshot, publish, open, dispose };
};
