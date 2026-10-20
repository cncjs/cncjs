/* eslint-env jest */
import { EventEmitter } from 'events';
import { createPreflight } from '../motion-preflight';

// Any attempt to reach the machine fails the test outright.
const forbidden = () => {
  throw new Error('Physical transport forbidden in this test');
};

const fakeController = (port = 'TEST') => {
  const state = { status: { activeState: 'Idle' } };
  return {
    type: 'Grbl',
    options: { port },
    ready: true,
    isClose: () => false,
    runner: Object.assign(new EventEmitter(), { state }),
    workflow: { state: 'idle' },
    state,
    feeder: { toJSON: () => ({ queue: 0, pending: false }) },
    settings: { settings: { $110: '1600.000', $111: 1600, $112: 1600 } },
    command: forbidden,
    write: forbidden,
    writeln: forbidden
  };
};

// Returns the `code` of the error `fn` throws, or undefined when it does not.
const codeOf = (fn) => {
  try {
    fn();
  } catch (err) {
    return err.code;
  }
  return undefined;
};

const input = { port: 'TEST', axis: 'X', direction: 1, step: 1, feed: 800 };

const setup = () => {
  const ctx = {
    now: 0,
    events: [],
    session: { loading: false, confirmationPending: false },
    c: fakeController()
  };
  ctx.registry = { TEST: ctx.c };
  ctx.store = { get: () => ctx.registry };
  ctx.config = { get: () => ctx.events };
  ctx.service = createPreflight(ctx.store, ctx.config, () => ctx.session, () => ctx.now);
  ctx.report = () => ctx.c.runner.emit('status');
  ctx.reject = (code, body = input) => {
    expect(codeOf(() => ctx.service.preview(body))).toBe(code);
  };
  ctx.service.inspect('TEST'); // The first inspection attaches the status listener.
  return ctx;
};

describe('motion preflight', () => {
  test('requires every server dependency', () => {
    const { store, config } = setup();
    expect(() => createPreflight(store, config)).toThrow(/obligatoires/);
  });

  test('watches the controller once and waits for a fresh report', () => {
    const ctx = setup();
    expect(ctx.service.inspect('TEST').code).toBe('STALE');
    expect(ctx.c.runner.listenerCount('status')).toBe(1);

    ctx.report(); // Timestamp zero is valid.
    expect(ctx.service.inspect('TEST').available).toBe(true);
  });

  test('previews every supported combination without touching the input or the machine', () => {
    const ctx = setup();
    ctx.report();
    let combinations = 0;
    ['X', 'Y', 'Z'].forEach((axis) => {
      [-1, 1].forEach((direction) => {
        [0.1, 1, 10].forEach((step) => {
          [200, 800, 1500].forEach((feed) => {
            const body = { ...input, axis, direction, step, feed };
            const before = JSON.stringify(body);
            const result = ctx.service.preview(body);
            expect(result.gcode).toBe(`$J=G21 G91 ${axis}${direction * step} F${feed}`);
            expect(result.dryRun).toBe(true);
            expect(result.distanceMm).toBe(direction * step);
            expect(Object.isFrozen(result)).toBe(true);
            expect(JSON.stringify(body)).toBe(before);
            combinations++;
          });
        });
      });
    });
    expect(combinations).toBe(54);
  });

  test('rejects anything but the exact request shape', () => {
    const ctx = setup();
    ctx.report();
    [
      null, [], {},
      { ...input, command: 'M3' }, { ...input, execute: true }, { ...input, dryRun: false },
      { ...input, axis: 'X\nM3' }, { ...input, axis: 'x' },
      { ...input, direction: '1' }, { ...input, direction: 0 },
      { ...input, step: '1' }, { ...input, step: -1 }, { ...input, step: Infinity },
      { ...input, feed: NaN }, { ...input, feed: '800' }, { ...input, feed: 0 }, { ...input, feed: 801 },
      Object.assign(Object.create(input), input),
      { ...input, [Symbol('extra')]: true }
    ].forEach((body) => ctx.reject('INPUT', body));

    ctx.reject('PORT', { ...input, port: 'TEST\nM3' });
    ctx.reject('CONNECTION', { ...input, port: 'toString' });
    ctx.reject('CONNECTION', { ...input, port: 'MISSING' });
  });

  test('a report is fresh for 2500 ms and never after the clock runs backwards', () => {
    const ctx = setup();
    ctx.report();
    ctx.now = 2500;
    expect(ctx.service.inspect('TEST').available).toBe(true);
    ctx.now = 2501;
    ctx.reject('STALE');
    ctx.report();
    ctx.now--;
    ctx.reject('STALE');
  });

  test('the machine must be idle according to the runner, not the controller copy', () => {
    const ctx = setup();
    ctx.now = 3000;
    ctx.report();
    ['Alarm', 'Run', 'Hold', 'Door', 'Jog', 'Home', 'Sleep', '', undefined].forEach((activeState) => {
      ctx.c.state.status.activeState = activeState;
      ctx.reject('BUSY');
    });
    ctx.c.state.status.activeState = 'Idle';

    // A native controller's display copy can lag its runner by 250 ms.
    ctx.c.runner.state = { status: { activeState: 'Alarm' } };
    ctx.report();
    expect(ctx.c.state.status.activeState).toBe('Idle');
    ctx.reject('BUSY');

    ctx.c.runner.state = {};
    ctx.report();
    ctx.reject('BUSY'); // Never fall back to a stale Idle.
  });

  test('the workflow, feeder, session and automations must all be quiet', () => {
    const ctx = setup();
    ctx.report();

    ['running', 'paused', undefined].forEach((state) => {
      ctx.c.workflow.state = state;
      ctx.reject('BUSY');
    });
    ctx.c.workflow.state = 'idle';

    const feeder = ctx.c.feeder.toJSON;
    [{ queue: 1, pending: false }, { queue: 0, pending: true }, {}, null].forEach((queue) => {
      ctx.c.feeder.toJSON = () => queue;
      ctx.reject('QUEUE');
    });
    ctx.c.feeder.toJSON = feeder;

    const session = ctx.session;
    [{ loading: true, confirmationPending: false }, { loading: false, confirmationPending: true }, {}, null].forEach((value) => {
      ctx.session = value;
      ctx.reject('SESSION');
    });
    ctx.session = session;

    [[{ enabled: true }], [{}], [null], null, {}].forEach((value) => {
      ctx.events = value;
      ctx.reject('EVENTS');
    });
    ctx.events = [{ enabled: false }];
    expect(ctx.service.inspect('TEST').available).toBe(true);
  });

  test('the feed is checked against the controller limit of the requested axis', () => {
    const ctx = setup();
    ctx.report();

    [undefined, null, '', true, 0, -1, Infinity, 'Infinity', '1000junk'].forEach((value) => {
      ctx.c.settings.settings.$110 = value;
      ctx.reject('LIMIT');
    });
    ctx.c.settings.settings.$110 = 799;
    ctx.reject('FEED');
    ctx.c.settings.settings.$110 = '1600.000';

    ctx.c.settings.settings.$112 = 200;
    expect(ctx.service.preview({ ...input, axis: 'Z', feed: 200 }).feedMmMin).toBe(200);
    ctx.reject('FEED', { ...input, axis: 'Z', feed: 800 });
    expect(ctx.service.preview(input).feedMmMin).toBe(800); // Z limit must not apply to X.
  });

  test('a controller that is renamed, not ready or closed must report again afterwards', () => {
    const ctx = setup();
    ctx.report();

    ctx.c.options.port = 'OTHER';
    ctx.reject('CONNECTION');
    ctx.c.options.port = 'TEST';
    expect(ctx.service.inspect('TEST').code).toBe('STALE');
    ctx.report();

    ctx.c.ready = false;
    ctx.reject('CONNECTION');
    ctx.c.ready = true;
    expect(ctx.service.inspect('TEST').code).toBe('STALE');
    ctx.report();

    ctx.c.isClose = () => true;
    ctx.reject('CONNECTION');
    ctx.c.isClose = () => false;
    expect(ctx.service.inspect('TEST').code).toBe('STALE');
    ctx.report();
    expect(ctx.service.inspect('TEST').available).toBe(true);
  });

  test('a replacement controller instance needs its own report', () => {
    const ctx = setup();
    ctx.report();
    const old = ctx.c;
    ctx.c = fakeController();
    ctx.registry.TEST = ctx.c;

    ctx.reject('STALE');
    expect(old.runner.listenerCount('status')).toBe(0);
    old.runner.emit('status');
    ctx.reject('STALE');
    ctx.c.runner.emit('status');
    expect(ctx.service.inspect('TEST').available).toBe(true);

    ctx.registry = {};
    ctx.reject('CONNECTION');
    expect(ctx.c.runner.listenerCount('status')).toBe(0);
    ctx.registry = { TEST: ctx.c };
    ctx.reject('STALE');
    expect(old.workflow.state).toBe('idle');
    expect(ctx.c.workflow.state).toBe('idle');
  });

  test('dispose removes listeners and is idempotent', () => {
    const ctx = setup();
    ctx.report();
    ctx.service.dispose();
    ctx.service.dispose();
    expect(ctx.c.runner.listenerCount('status')).toBe(0);
    ctx.reject('CLOSED');
  });

  test('a failing session callback is reported as unavailable, not as its message', () => {
    const ctx = setup();
    const broken = createPreflight(ctx.store, ctx.config, () => {
      throw new Error('private information');
    }, () => ctx.now);
    broken.inspect('TEST');
    ctx.report();
    expect(broken.inspect('TEST')).toEqual({
      dryRun: true,
      available: false,
      code: 'UNAVAILABLE',
      reason: 'État serveur indisponible.'
    });
    expect(() => broken.preview(input)).toThrow();
    broken.dispose();
  });
});
