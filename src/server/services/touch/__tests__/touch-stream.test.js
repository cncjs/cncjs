/* eslint-env jest */
import { EventEmitter } from 'events';
import fs from 'fs';
import os from 'os';
import path from 'path';
import vm from 'vm';
import { createService } from '../job-service';
import { createStream } from '../touch-stream';

// Deterministic replacements for the stream's timers.
const fakeTimers = () => {
  let id = 0;
  const intervals = new Map();
  const timeouts = new Map();
  return {
    intervals,
    timeouts,
    setInterval: (fn) => {
      intervals.set(++id, fn);
      return id;
    },
    clearInterval: (key) => intervals.delete(key),
    setTimeout: (fn) => {
      timeouts.set(++id, fn);
      return id;
    },
    clearTimeout: (key) => timeouts.delete(key),
    // Runs every pending coalesced publish.
    flush: () => {
      const tasks = Array.from(timeouts.values());
      timeouts.clear();
      tasks.forEach((fn) => fn());
    }
  };
};

// Enough of an Express response to capture NDJSON lines.
const fakeResponse = () => {
  const res = new EventEmitter();
  return Object.assign(res, {
    statusCode: 200,
    lines: [],
    headers: {},
    ended: false,
    setHeader(key, value) {
      this.headers[key] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(data) {
      this.data = data;
      return this;
    },
    write(line) {
      this.lines.push(JSON.parse(line));
      return true;
    },
    flush() {},
    flushHeaders() {},
    end() {
      this.ended = true;
    }
  });
};

const fakeController = () => {
  const c = {
    type: 'Grbl',
    options: { port: 'A' },
    ready: true,
    isClose: () => false,
    runner: new EventEmitter(),
    sender: new EventEmitter(),
    workflow: { state: 'idle' },
    state: { status: { activeState: 'Idle', wpos: { x: 1, y: 2, z: 3 }, mpos: { x: 4, y: 5, z: 6 } } },
    settings: { settings: { $110: '5000', $20: '1', secret: 'must-not-copy' } },
    feeder: { toJSON: () => ({ queue: 0, pending: false }) },
    commands: []
  };
  c.runner.state = JSON.parse(JSON.stringify(c.state));
  c.sender.state = { name: '', context: {}, total: 0, gcode: 'DO NOT SEND GCODE' };
  c.sender.toJSON = () => c.sender.state;
  c.command = (name, ...args) => {
    c.commands.push(name);
    if (name === 'gcode:load') {
      c.sender.state = { name: args[0], context: args[2], total: 1, gcode: args[1] };
      c.sender.emit('load');
      args[3](null);
    }
  };
  return c;
};

let dir;

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cnc-touch-stream-'));
  fs.writeFileSync(path.join(dir, 'test.nc'), 'G1 X1');
});

afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

const setup = () => {
  const ctx = { now: 10000, registry: { A: fakeController() }, timers: fakeTimers() };
  ctx.service = createService({ get: () => ctx.registry }, { get: (key) => (key === 'watchDirectory' ? dir : []) }, () => ctx.now);
  ctx.stream = createStream(ctx.service, { clock: () => ctx.now, timers: ctx.timers });
  // Opens an event stream and returns its request and response.
  ctx.connect = () => {
    const req = new EventEmitter();
    const res = fakeResponse();
    expect(ctx.stream.open(req, res)).toBe(true);
    return { req, res };
  };
  return ctx;
};

describe('touch stream', () => {
  test('publishes raw controller state without G-code or unknown settings', () => {
    const ctx = setup();
    const first = ctx.registry.A;
    const { res } = ctx.connect();
    expect(res.headers['Content-Type']).toMatch(/x-ndjson/);
    expect(res.lines[0].controllers[0].fresh).toBe(false);

    first.runner.emit('status', { raw: '<Idle|MPos:4,5,6|Pn:X>' });
    ctx.timers.flush();
    const packet = res.lines.at(-1);
    const machine = packet.controllers[0];
    expect(machine.fresh).toBe(true);
    expect(machine.statusAgeMs).toBe(0);
    expect(machine.controllerId).toBe('A');
    expect(machine.generation).toBeTruthy();
    expect(machine.coordinates.wpos.x).toBe(1);
    expect(machine.settings.$110).toBe('5000');
    expect(machine.probeInput.state).toBe('free');
    expect(JSON.stringify(packet)).not.toContain('DO NOT SEND GCODE');
    expect(JSON.stringify(packet)).not.toContain('must-not-copy');

    ctx.now += 2600;
    ctx.stream.publish();
    expect(res.lines.at(-1).controllers[0].fresh).toBe(false);
    expect(res.lines.at(-1).controllers[0].probeInput.fresh).toBe(false);
    ctx.stream.dispose();
  });

  test('reports units and WCS only from observed parser reports', () => {
    const ctx = setup();
    const first = ctx.registry.A;
    first.runner.emit('status', { raw: '<Idle|MPos:4,5,6>' });
    expect(ctx.service.list()[0].operator).toEqual({ reportUnits: null, wcs: null });

    first.settings.settings.$13 = '0';
    first.runner.state.parserstate = { modal: { wcs: 'G55' } };
    // A cached/default WCS is not a received parser report.
    expect(ctx.service.list()[0].operator.wcs).toBe(null);
    first.runner.emit('parserstate', { modal: { wcs: 'G55' } });
    expect(ctx.service.list()[0].operator).toEqual({ reportUnits: 'mm', wcs: 'G55' });

    ctx.now += 2501;
    expect(ctx.service.list()[0].operator.wcs).toBe(null);
    ctx.now -= 2501;

    first.settings.settings.$13 = 1;
    first.runner.emit('parserstate', { modal: { wcs: 'G99' } });
    expect(ctx.service.list()[0].operator).toEqual({ reportUnits: 'in', wcs: null });
    ctx.stream.dispose();
  });

  test('a non-idle runner state blocks loading, starting and motion preview', async () => {
    const ctx = setup();
    const first = ctx.registry.A;
    const { res } = ctx.connect();
    first.runner.emit('status', { raw: '<Idle|MPos:4,5,6|Pn:P>' });
    ctx.timers.flush();
    const machine = res.lines.at(-1).controllers[0];
    const transportId = res.lines.at(-1).transportId;
    await ctx.service.action({ port: 'A', generation: machine.generation, transportId, action: 'load', file: 'test.nc' });
    const loaded = ctx.service.list()[0];

    const expectBlocked = async (activeState) => {
      first.runner.state.status = { activeState, wpos: { x: 99, y: 98, z: 97 }, mpos: { x: 96, y: 95, z: 94 } };
      first.runner.emit('status', { raw: '<' + activeState + '|MPos:96,95,94>' });
      ctx.timers.flush();
      const raw = res.lines.at(-1).controllers[0];
      expect(first.state.status.activeState).toBe('Idle');
      expect(raw.activeState).toBe(activeState);
      expect(raw.coordinates.wpos.x).toBe(99);
      expect(raw.statusAgeMs).toBe(0);
      expect(raw.canLoad).toBe(false);
      expect(raw.canStart).toBe(false);
      expect(raw.canPreviewMotion).toBe(false);
      await expect(ctx.service.action({
        port: 'A', generation: machine.generation, transportId, action: 'prepare', operation: 'start', revision: loaded.revision
      })).rejects.toThrow(/repos/);
    };
    await expectBlocked('Alarm');
    await expectBlocked('Run');
    ctx.stream.dispose();
  });

  test('closing a stream revokes its confirmations; a replaced controller gets a new generation', async () => {
    const ctx = setup();
    const first = ctx.registry.A;
    const connection = ctx.connect();
    first.runner.emit('status', { raw: '<Idle|MPos:4,5,6>' });
    ctx.timers.flush();
    const machine = connection.res.lines.at(-1).controllers[0];
    const transportId = connection.res.lines.at(-1).transportId;
    await ctx.service.action({ port: 'A', generation: machine.generation, transportId, action: 'load', file: 'test.nc' });
    const loaded = ctx.service.list()[0];
    const ticket = await ctx.service.action({
      port: 'A', generation: machine.generation, transportId, action: 'prepare', operation: 'start', revision: loaded.revision
    });

    connection.res.emit('close');
    expect(connection.res.ended).toBe(true);
    await expect(ctx.service.action({ port: 'A', generation: machine.generation, transportId, action: 'start', nonce: ticket.nonce }))
      .rejects.toThrow(/interrompue/);
    expect(first.commands).toEqual(['gcode:load']);

    const second = ctx.connect().res;
    ctx.registry.A = fakeController();
    ctx.stream.publish();
    const replaced = second.lines.at(-1).controllers[0];
    expect(replaced.generation).not.toBe(machine.generation);
    expect(replaced.fresh).toBe(false);
    expect(first.runner.listenerCount('status')).toBe(0);
    expect(first.runner.listenerCount('parserstate')).toBe(0);
    expect(first.sender.listenerCount('load')).toBe(0);
    // Pause and stop are never refused for a stale identity: only the machine state decides.
    await expect(ctx.service.action({ port: 'A', generation: machine.generation, action: 'pause' })).rejects.toThrow(/Aucun travail/);
    await expect(ctx.service.action({ port: 'A', generation: machine.generation, action: 'prepare', operation: 'start' })).rejects.toThrow(/changé|identité/);

    // A long-lived response is rotated so the client reconnects.
    ctx.now += 60000;
    ctx.stream.publish();
    expect(second.ended).toBe(true);
    expect(second.lines.at(-1).rotate).toBe(true);
    ctx.stream.dispose();
  });

  test('a stream holding a pending confirmation is renewed after it, within a bounded grace', () => {
    let now = 1000;
    let pending = true;
    const closed = [];
    const service = {
      list: () => [],
      subscribe: () => () => {},
      openTransport: () => {},
      closeTransport: (id) => closed.push(id),
      ticketPending: () => pending,
      dispose: () => {}
    };
    const stream = createStream(service, { clock: () => now, timers: fakeTimers() });
    const res = fakeResponse();
    stream.open(new EventEmitter(), res);
    now += 60000;
    stream.publish();
    expect(res.ended).toBe(false);
    now += 18999;
    stream.publish();
    expect(res.ended).toBe(false);
    now += 1001;
    stream.publish();
    expect(res.ended).toBe(true);
    expect(closed).toHaveLength(1);

    // Without a pending confirmation, the usual minute applies.
    pending = false;
    const other = fakeResponse();
    stream.open(new EventEmitter(), other);
    now += 60000;
    stream.publish();
    expect(other.ended).toBe(true);
    stream.dispose();
  });

  test('refuses more than the maximum number of clients', () => {
    const ctx = setup();
    const opened = [];
    for (let i = 0; i < 8; i++) {
      opened.push(ctx.connect());
    }
    const res = fakeResponse();
    expect(ctx.stream.open(new EventEmitter(), res)).toBe(false);
    expect(res.headers).toEqual({});
    ctx.stream.dispose();
    expect(opened.every(({ res: r }) => r.ended)).toBe(true);
  });

  test('heartbeat and rotation use a monotonic clock by default (wall clock set back by NTP)', () => {
    let wall = 1800000000000;
    let mono = 50000;
    const wallSpy = jest.spyOn(Date, 'now').mockImplementation(() => wall);
    const monoSpy = jest.spyOn(performance, 'now').mockImplementation(() => mono);
    try {
      const timers = fakeTimers();
      const service = {
        list: () => [{ port: 'A' }],
        subscribe: () => () => {},
        openTransport() {},
        closeTransport() {},
        ticketPending: () => false,
        dispose() {}
      };
      const stream = createStream(service, { timers });
      const req = new EventEmitter();
      const res = fakeResponse();
      stream.open(req, res);
      expect(res.lines).toHaveLength(1);
      const [heartbeat] = timers.intervals.values();
      mono += 1100;
      heartbeat();
      expect(res.lines).toHaveLength(2);
      mono += 1100;
      wall -= 3600000;
      heartbeat();
      expect(res.lines).toHaveLength(3); // the heartbeat goes on
      expect(res.lines[2].sentAt).toBe(wall); // sentAt stays a wall-clock time
      mono += 60000;
      heartbeat();
      expect(res.ended).toBe(true); // rotated after its lifetime
      expect(res.lines[res.lines.length - 1]).toEqual({ rotate: true });
      stream.dispose();
    } finally {
      wallSpy.mockRestore();
      monoSpy.mockRestore();
    }
  });

  test('the heartbeat never keeps the process alive on its own', () => {
    const ctx = setup();
    const handle = { unref: jest.fn() };
    const timers = { ...ctx.timers, setInterval: () => handle };
    const stream = createStream(ctx.service, { clock: () => ctx.now, timers });
    expect(handle.unref).toHaveBeenCalledTimes(1);
    stream.dispose();
  });

  test('dispose clears timers, listeners and the service', () => {
    const ctx = setup();
    const { res } = ctx.connect();
    ctx.registry.A.runner.emit('status');
    expect(ctx.timers.timeouts.size).toBe(1);
    ctx.stream.dispose();
    expect(res.ended).toBe(true);
    expect(ctx.timers.intervals.size).toBe(0);
    expect(ctx.timers.timeouts.size).toBe(0);
    expect(ctx.registry.A.runner.listenerCount('status')).toBe(0);
    expect(ctx.registry.A.sender.listenerCount('load')).toBe(0);
    expect(() => ctx.service.list()).toThrow(/indisponible/);
    ctx.stream.dispose(); // idempotent
  });

  test('every serialized packet satisfies the browser protocol validator', () => {
    const ctx = setup();
    const first = ctx.registry.A;
    const { res } = ctx.connect();
    first.runner.emit('status', { raw: '<Idle|MPos:4,5,6|Pn:X>' });
    ctx.timers.flush();
    ctx.now += 3000;
    ctx.stream.publish();

    const browser = { window: {} };
    const client = path.resolve(__dirname, '../../../../../examples/cncjs-touch/touch/job-stream.js');
    vm.runInNewContext(fs.readFileSync(client, 'utf8'), browser);
    const { validSnapshot } = browser.window.CNCJobStream;
    expect(res.lines.length).toBeGreaterThan(1);
    res.lines.filter((p) => !p.rotate).forEach((p) => {
      expect(validSnapshot(p, true)).toBe(true);
    });
    expect(validSnapshot(JSON.parse(JSON.stringify(ctx.stream.snapshot())), false)).toBe(true);
    ctx.stream.dispose();
  });
});
