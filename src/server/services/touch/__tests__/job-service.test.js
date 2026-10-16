/* eslint-env jest */
import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { createService } from '../job-service';

// A fake Grbl controller that records commands and mimics the sender/workflow
// transitions the service observes. It never touches a serial port.
const fakeController = (port = 'TEST') => {
  const c = {
    type: 'Grbl',
    options: { port },
    ready: true,
    isClose: () => false,
    runner: new EventEmitter(),
    sender: new EventEmitter(),
    workflow: { state: 'idle' },
    state: { status: { activeState: 'Idle' } },
    feeder: { toJSON: () => ({ queue: 0, pending: false }) },
    settings: { settings: { $110: 1000, $111: 1000, $112: 200 } },
    commands: []
  };
  c.runner.state = c.state;
  c.sender.state = { name: '', context: {}, total: 0 };
  c.sender.toJSON = () => ({ ...c.sender.state });
  c.command = (name, ...args) => {
    c.commands.push([name, ...args]);
    if (name === 'gcode:load') {
      c.sender.state = { name: args[0], context: args[2], total: 3 };
      c.sender.emit('load');
      args[3](null);
    }
    if (name === 'gcode:start' || name === 'gcode:resume') {
      c.workflow.state = 'running';
    }
    if (name === 'gcode:pause') {
      c.workflow.state = 'paused';
      c.state.status.activeState = 'Hold';
    }
    if (name === 'gcode:stop') {
      c.workflow.state = 'idle';
      c.state.status.activeState = 'Idle';
    }
  };
  return c;
};

let root;

beforeAll(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'cnc-touch-job-'));
  await fs.writeFile(path.join(root, 'test.nc'), 'G21 G90\nG1 X1 F100\nM2');
  await fs.writeFile(path.join(root, 'macro.nc'), '%wait\nG1 X1');
});

afterAll(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

const setup = () => {
  const ctx = { now: 10000, events: [], c: fakeController() };
  ctx.controllers = { TEST: ctx.c };
  ctx.service = createService(
    { get: () => ctx.controllers },
    { get: (key) => (key === 'watchDirectory' ? root : ctx.events) },
    () => ctx.now
  );
  ctx.generation = ctx.service.list()[0].generation;
  ctx.transportId = 'offline-transport';
  ctx.service.openTransport(ctx.transportId);
  ctx.req = (action, extra = {}) => ctx.service.action({
    port: 'TEST',
    generation: ctx.generation,
    transportId: ctx.transportId,
    action,
    ...extra
  });
  ctx.report = () => ctx.c.runner.emit('status');
  ctx.state = () => ctx.service.list()[0];
  // Loads test.nc on a fresh, idle controller.
  ctx.loaded = async () => {
    ctx.report();
    await ctx.req('load', { file: 'test.nc' });
    return ctx.state();
  };
  return ctx;
};

describe('job service', () => {
  test('load needs a fresh idle controller and a plain file name', async () => {
    const ctx = setup();
    await expect(ctx.req('load', { file: 'test.nc' })).rejects.toThrow(/trop ancien/);

    ctx.report();
    ctx.c.state.status.activeState = 'Alarm';
    await expect(ctx.req('load', { file: 'test.nc' })).rejects.toThrow(/repos/);
    expect(ctx.c.commands).toEqual([]);

    ctx.c.state.status.activeState = 'Idle';
    await expect(ctx.req('load', { file: '../test.nc' })).rejects.toThrow(/invalide/);

    await ctx.req('load', { file: 'test.nc' });
    expect(ctx.c.commands).toHaveLength(1);
    expect(ctx.c.commands[0][0]).toBe('gcode:load');
    expect(ctx.state().canStart).toBe(true);
  });

  test('prepare, start and resume need the controller identity and an open transport', async () => {
    const ctx = setup();
    await ctx.loaded();
    await Promise.all(['prepare', 'start', 'resume'].flatMap((action) => [
      expect(ctx.service.action({ port: 'TEST', action, transportId: ctx.transportId })).rejects.toThrow(/identité/),
      expect(ctx.service.action({ port: 'TEST', action, generation: ctx.generation })).rejects.toThrow(/interrompue/),
      expect(ctx.service.action({ port: 'TEST', action, generation: ctx.generation, transportId: 'closed-transport' })).rejects.toThrow(/interrompue/)
    ]));
  });

  test('a start confirmation expires, is single-use and is re-checked against the machine', async () => {
    const ctx = setup();
    const state = await ctx.loaded();

    let ticket = await ctx.req('prepare', { operation: 'start', revision: state.revision });
    ctx.now += 16000;
    ctx.report();
    await expect(ctx.req('start', { nonce: ticket.nonce })).rejects.toThrow(/expirée/);

    ticket = await ctx.req('prepare', { operation: 'start', revision: state.revision });
    ctx.c.state.status.activeState = 'Alarm';
    await expect(ctx.req('start', { nonce: ticket.nonce })).rejects.toThrow(/repos/);
    expect(ctx.c.commands).toHaveLength(1);

    ctx.c.state.status.activeState = 'Idle';
    ticket = await ctx.req('prepare', { operation: 'start', revision: state.revision });
    await ctx.req('start', { nonce: ticket.nonce });
    expect(ctx.c.commands.at(-1)[0]).toBe('gcode:start');
    await expect(ctx.req('start', { nonce: ticket.nonce })).rejects.toThrow(/expirée/);
  });

  test('pause, resume and stop follow the workflow; stop forces and requires a reload', async () => {
    const ctx = setup();
    let state = await ctx.loaded();
    let ticket = await ctx.req('prepare', { operation: 'start', revision: state.revision });
    await ctx.req('start', { nonce: ticket.nonce });

    await ctx.req('pause');
    state = ctx.state();
    expect(state.canResume).toBe(true);
    ticket = await ctx.req('prepare', { operation: 'resume', revision: state.revision });
    await ctx.req('resume', { nonce: ticket.nonce });
    expect(ctx.c.commands.at(-1)[0]).toBe('gcode:resume');

    await ctx.req('stop');
    expect(ctx.c.commands.at(-1)).toEqual(['gcode:stop', { force: true }]);
    await expect(ctx.req('prepare', { operation: 'start', revision: state.revision })).rejects.toThrow(/Rechargez/);
  });

  test('a sender load or a stale report invalidates a pending confirmation', async () => {
    const ctx = setup();
    let state = await ctx.loaded();
    const ticket = await ctx.req('prepare', { operation: 'start', revision: state.revision });
    ctx.c.sender.emit('load');
    await expect(ctx.req('start', { nonce: ticket.nonce })).rejects.toThrow(/expirée/);

    await ctx.req('load', { file: 'test.nc' });
    state = ctx.state();
    ctx.now += 3000;
    await expect(ctx.req('prepare', { operation: 'start', revision: state.revision })).rejects.toThrow(/trop ancien/);
  });

  test('refuses enabled automations, % directives and a disconnected controller', async () => {
    const ctx = setup();
    ctx.report();
    ctx.events = [{ enabled: true }];
    await expect(ctx.req('load', { file: 'test.nc' })).rejects.toThrow(/Automatismes/);

    ctx.events = [];
    await expect(ctx.req('load', { file: 'macro.nc' })).rejects.toThrow(/directives/);

    ctx.controllers = {};
    await expect(ctx.req('start', { nonce: 'fake' })).rejects.toThrow(/non connecté/);
  });

  test('motion preview is blocked while a load or a confirmation is pending', async () => {
    const ctx = setup();
    const body = { port: 'TEST', axis: 'X', direction: 1, step: 1, feed: 800 };
    expect(ctx.state().canPreviewMotion).toBe(false);

    ctx.report();
    expect(ctx.state().canPreviewMotion).toBe(true);
    expect(ctx.service.previewMotion(body).dryRun).toBe(true);
    expect(() => ctx.service.previewMotion({ ...body, axis: 'Z' })).toThrow(expect.objectContaining({ code: 'FEED' }));
    expect(ctx.c.commands).toEqual([]);

    // Hold the load open: the controller callback completes it later.
    let completeLoad;
    const loadRequested = new Promise((resolve) => {
      ctx.c.command = (name, file, gcode, context, done) => {
        ctx.c.commands.push([name]);
        completeLoad = () => {
          ctx.c.sender.state = { name: file, context, total: 2 };
          ctx.c.sender.emit('load');
          done(null);
        };
        resolve();
      };
    });
    const loading = ctx.req('load', { file: 'test.nc' });
    expect(ctx.state().canPreviewMotion).toBe(false);
    expect(() => ctx.service.previewMotion(body)).toThrow(expect.objectContaining({ code: 'SESSION' }));
    await loadRequested;
    completeLoad();
    await loading;

    const state = ctx.state();
    expect(state.canPreviewMotion).toBe(true);
    await ctx.req('prepare', { operation: 'start', revision: state.revision });
    expect(ctx.state().canPreviewMotion).toBe(false);
    expect(() => ctx.service.previewMotion(body)).toThrow(expect.objectContaining({ code: 'SESSION' }));

    ctx.now += 15001;
    ctx.report();
    expect(ctx.state().canPreviewMotion).toBe(true);
    expect(ctx.service.previewMotion(body).dryRun).toBe(true);
    expect(ctx.c.commands).toEqual([['gcode:load']]); // No start, jog or raw G-code ever sent.

    ctx.c.state.status.activeState = 'Alarm';
    expect(ctx.state().canPreviewMotion).toBe(false);
    expect(() => ctx.service.previewMotion(body)).toThrow(expect.objectContaining({ code: 'BUSY' }));
  });

  test('the snapshot reports the probe input from raw status reports', () => {
    const ctx = setup();
    expect(ctx.state().probeInput.state).toBe('unknown');
    ctx.c.runner.emit('status', { raw: '<Idle|MPos:0,0,0|Pn:P>' });
    expect(ctx.state().probeInput.state).toBe('contact');
    expect(ctx.state().probeInput.canProbe).toBe(false);
  });
});
