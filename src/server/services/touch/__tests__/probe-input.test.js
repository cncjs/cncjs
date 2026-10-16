/* eslint-env jest */
import { EventEmitter } from 'events';
import { createProbeInput } from '../probe-input';

const setup = () => {
  const ctx = { now: 10000, closed: false, registry: {} };
  ctx.controller = (port) => ({
    type: 'Grbl',
    options: { port },
    ready: true,
    isClose: () => ctx.closed,
    runner: new EventEmitter(),
    command: () => {
      throw new Error('Forbidden command');
    }
  });
  ctx.c = ctx.controller('TEST');
  ctx.registry.TEST = ctx.c;
  ctx.input = createProbeInput({ get: () => ctx.registry }, () => ctx.now);
  ctx.read = () => ctx.input.inspect('TEST');
  // GrblRunner fills a missing pinState with ''; only `raw` is interpreted.
  ctx.emit = (raw) => ctx.c.runner.emit('status', { raw, pinState: '' });
  ctx.read(); // The first inspection attaches the status listener.
  return ctx;
};

describe('probe input', () => {
  test('reads the P pin from an explicit Pn field, in any machine state', () => {
    const ctx = setup();
    expect(ctx.read().state).toBe('unknown');
    expect(ctx.read().code).toBe('WAITING');

    ctx.emit('<Idle|MPos:0,0,0|Pn:P>');
    expect(ctx.read().state).toBe('contact');
    expect(ctx.read().canProbe).toBe(false);

    ctx.emit('<Alarm|MPos:0,0,0|Pn:XYZ>'); // Alarm doesn't hide passive input data.
    expect(ctx.read().state).toBe('free');

    ctx.emit('<Hold:0|MPos:0,0,0|Pn:PD>');
    expect(ctx.read().state).toBe('contact');
  });

  test('a report without Pn is "missing", never "free"', () => {
    const ctx = setup();
    ctx.emit('<Idle|MPos:0,0,0>');
    expect(ctx.read().state).toBe('unknown');
    expect(ctx.read().code).toBe('MISSING');
  });

  test('ignores PRB parameters and malformed reports', () => {
    const ctx = setup();
    ctx.emit('<Idle|MPos:0,0,0|Pn:P>');
    ctx.c.runner.emit('parameters', { prb: { x: 1, y: 2, z: 3 }, success: 1 });
    expect(ctx.read().state).toBe('contact');

    [
      undefined, '[PRB:1,2,3:1]', '<Idle,MPos:0,0,0,Pn:P>', '<Idle|Pn:>', '<Idle|Pn:PP>',
      '<Idle|Pn:Q>', '<Idle|Pn:P|Pn:X>', '<Idle|Pn:p>', '<Idle|Pn:P>\n'
    ].forEach((raw) => {
      ctx.emit(raw);
      expect(ctx.read().state).toBe('unknown');
    });
  });

  test('a report is stale after 2500 ms or when the clock runs backwards', () => {
    const ctx = setup();
    ctx.emit('<Idle|Pn:P>');
    ctx.now += 2501;
    expect(ctx.read().state).toBe('unknown');
    expect(ctx.read().code).toBe('STALE');

    ctx.emit('<Idle|Pn:X>');
    expect(ctx.read().state).toBe('free');
    ctx.now -= 1;
    expect(ctx.read().state).toBe('unknown');
  });

  test('a controller startup resets the observation', () => {
    const ctx = setup();
    ctx.emit('<Idle|Pn:P>');
    ctx.c.runner.emit('startup', {});
    expect(ctx.read().code).toBe('WAITING');
  });

  test('stops listening to a controller that is not ready, replaced, removed or closed', () => {
    const ctx = setup();
    ctx.emit('<Idle|Pn:P>');
    ctx.c.ready = false;
    expect(ctx.read().state).toBe('unknown');
    expect(ctx.c.runner.listenerCount('status')).toBe(0);
    ctx.c.ready = true;
    expect(ctx.read().code).toBe('WAITING');
    ctx.emit('<Idle|Pn:P>');

    const replacement = ctx.controller('TEST');
    ctx.registry.TEST = replacement;
    expect(ctx.read().code).toBe('WAITING');
    expect(ctx.c.runner.listenerCount('status')).toBe(0);
    replacement.runner.emit('status', { raw: '<Idle|Pn:P>' });
    expect(ctx.read().state).toBe('contact');

    ctx.registry = {};
    ctx.input.sync();
    expect(replacement.runner.listenerCount('status')).toBe(0);
    expect(replacement.runner.listenerCount('startup')).toBe(0);

    ctx.registry = { TEST: ctx.c };
    ctx.closed = true;
    expect(ctx.read().state).toBe('unknown');
    ctx.closed = false;
  });

  test('repeated reads attach a single listener, and dispose removes it', () => {
    const ctx = setup();
    for (let i = 0; i < 10; i++) {
      ctx.read();
    }
    expect(ctx.c.runner.listenerCount('status')).toBe(1);
    ctx.input.dispose();
    expect(ctx.c.runner.listenerCount('status')).toBe(0);
  });
});
