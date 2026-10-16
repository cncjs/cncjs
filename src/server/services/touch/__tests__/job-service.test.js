/* eslint-env jest */
import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { createService, changesOffset } from '../job-service';

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
  await fs.writeFile(path.join(root, 'offset.nc'), 'G21 G90\nG55\nG1 X1 F100\nM2');
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
  test('a controller destroyed by CNCjs (runner and sender set to null) is forgotten, not fatal', () => {
    const ctx = setup();
    ctx.report();
    expect(ctx.service.list()).toHaveLength(1);
    // What GrblController.destroy() leaves behind when the port disappears.
    ctx.c.isClose = () => true;
    ctx.c.runner = null;
    ctx.c.sender = null;
    expect(() => ctx.service.list()).not.toThrow();
    expect(ctx.service.list()).toEqual([]);
    delete ctx.controllers.TEST;
    expect(ctx.service.list()).toEqual([]);
    // Reconnected on the same port: a new controller, a new generation.
    const fresh = fakeController();
    ctx.controllers.TEST = fresh;
    fresh.runner.emit('status');
    const [state] = ctx.service.list();
    expect(state.port).toBe('TEST');
    expect(state.generation).not.toBe(ctx.generation);
  });

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

  test('a pause made while CNCjs holds for its end-of-program %wait can be resumed; M0 cannot', async () => {
    const ctx = setup();
    const state = await ctx.loaded();
    const ticket = await ctx.req('prepare', { operation: 'start', revision: state.revision });
    await ctx.req('start', { nonce: ticket.nonce });
    await ctx.req('pause');
    // What the real Sender keeps after hold() was first called by %wait.
    ctx.c.sender.state.holdReason = { data: '%wait', msg: '%wait ; Wait for the planner to empty' };
    ctx.report();
    expect(ctx.state().canResume).toBe(true);
    ctx.c.sender.state.holdReason = { data: 'M0', msg: 'M0' };
    expect(ctx.state().canResume).toBe(false);
    expect(ctx.state().resumeReason).toMatch(/pause simple/);
  });

  test('the work offset seen at start holds during a program that cannot change it', async () => {
    const ctx = setup();
    ctx.report();
    ctx.c.runner.emit('parserstate', { modal: { wcs: 'G54' } });
    let state = await ctx.loaded();
    expect(state.operator.wcs).toBe('G54');
    const ticket = await ctx.req('prepare', { operation: 'start', revision: state.revision });
    await ctx.req('start', { nonce: ticket.nonce });
    // CNCjs stops asking $G while streaming: the modal report grows old.
    ctx.now += 10000;
    ctx.report();
    expect(ctx.state().operator.wcs).toBe('G54');
    await ctx.req('pause');
    expect(ctx.state().operator.wcs).toBe('G54');
    await ctx.req('stop');
    expect(ctx.state().operator.wcs).toBe(null);
  });

  test('a program that selects or changes an offset leaves the offset unknown once $G is old', async () => {
    const ctx = setup();
    ctx.report();
    ctx.c.runner.emit('parserstate', { modal: { wcs: 'G54' } });
    await ctx.req('load', { file: 'offset.nc' });
    const state = ctx.state();
    const ticket = await ctx.req('prepare', { operation: 'start', revision: state.revision });
    await ctx.req('start', { nonce: ticket.nonce });
    ctx.now += 10000;
    ctx.report();
    expect(ctx.state().operator.wcs).toBe(null);
  });

  test('changesOffset finds offset words, not comments or other codes', () => {
    ['G55', 'g54', 'G59.1', 'G10 L2 P1 X0', 'G92 X0', 'G92.1', 'G0 X1\nG57 G0 Y2', 'G055'].forEach((code) => {
      expect(changesOffset(code)).toBe(true);
    });
    ['G0 X54', 'G1 F555', '(G55 in a comment)', '; G92 here', 'G21 G90 G17\nG1 X10 F400', 'G540', 'M5'].forEach((code) => {
      expect(changesOffset(code)).toBe(false);
    });
  });

  test('a program that ends is reported finished even after CNCjs rewinds the sender; a stop is not', async () => {
    const ctx = setup();
    let state = await ctx.loaded();
    let ticket = await ctx.req('prepare', { operation: 'start', revision: state.revision });
    await ctx.req('start', { nonce: ticket.nonce });
    expect(ctx.state().finished).toBe(false);
    ctx.c.sender.emit('end', ctx.now);
    expect(ctx.state().finished).toBe(false); // still running
    ctx.c.workflow.state = 'idle';
    ctx.c.sender.state = { ...ctx.c.sender.state, received: 0 }; // CNCjs rewinds at the end
    ctx.report();
    expect(ctx.state().finished).toBe(true);
    // A new load starts from scratch.
    state = await ctx.loaded();
    expect(state.finished).toBe(false);
    ticket = await ctx.req('prepare', { operation: 'start', revision: state.revision });
    await ctx.req('start', { nonce: ticket.nonce });
    await ctx.req('stop');
    ctx.c.sender.emit('end', ctx.now);
    expect(ctx.state().finished).toBe(false);
  });

  test('reports the real feed rate and spindle speed from the status report', () => {
    const ctx = setup();
    ctx.report();
    expect(ctx.state()).toMatchObject({ feedrate: null, spindleSpeed: null });
    ctx.c.state.status.feedrate = 400;
    ctx.c.state.status.spindle = 12000;
    expect(ctx.state()).toMatchObject({ feedrate: 400, spindleSpeed: 12000 });
    ctx.c.state.status.spindle = NaN;
    ctx.c.state.status.feedrate = -1;
    expect(ctx.state()).toMatchObject({ feedrate: null, spindleSpeed: null });
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

  test('overrides are accepted only during a running or held program, with Grbl step values', async () => {
    const ctx = setup();
    ctx.report();
    let state = ctx.state();
    expect(state.overrides).toBe(null);
    expect(state.canOverride).toBe(false);
    expect(state.overrideReason).toMatch(/en cours ou en pause/);
    await expect(ctx.req('override', { kind: 'feed', value: 10 })).rejects.toThrow(/en cours ou en pause/);

    ctx.c.state.status.ov = [100, 100, 100];
    state = await ctx.loaded();
    const ticket = await ctx.req('prepare', { operation: 'start', revision: state.revision });
    await ctx.req('start', { nonce: ticket.nonce });
    ctx.report();
    state = ctx.state();
    expect(state.overrides).toEqual({ feed: 100, rapid: 100, spindle: 100 });
    expect(state.canOverride).toBe(true);

    await expect(ctx.req('override', { kind: 'feed', value: 5 })).rejects.toThrow(/invalide/);
    await expect(ctx.req('override', { kind: 'laser', value: 10 })).rejects.toThrow(/invalide/);
    await expect(ctx.req('override', { kind: 'rapid', value: 75 })).rejects.toThrow(/invalide/);
    await expect(ctx.service.action({ port: 'TEST', action: 'override', transportId: ctx.transportId, kind: 'feed', value: 10 })).rejects.toThrow(/identité/);

    const sent = ctx.c.commands.length;
    expect((await ctx.req('override', { kind: 'feed', value: -10 })).message).toMatch(/avance : -10 %/);
    expect((await ctx.req('override', { kind: 'spindle', value: 1 })).message).toMatch(/broche : \+1 %/);
    expect((await ctx.req('override', { kind: 'rapid', value: 50 })).message).toMatch(/rapide : 50 %/);
    expect((await ctx.req('override', { kind: 'feed', value: 0 })).message).toMatch(/remise à 100/);
    expect(ctx.c.commands.slice(sent)).toEqual([['feedOverride', -10], ['spindleOverride', 1], ['rapidOverride', 50], ['feedOverride', 0]]);

    await ctx.req('pause');
    ctx.report();
    expect(ctx.state().canOverride).toBe(true);
    await ctx.req('stop');
    ctx.report();
    expect(ctx.state().canOverride).toBe(false);

    ctx.c.state.status.ov = [100, 'x', 100];
    expect(ctx.state().overrides).toBe(null);
  });

  test('macros are listed by name only and run through a confirmation ticket from an idle machine', async () => {
    const ctx = setup();
    ctx.events = { macros: [{ id: 'm1', name: 'Dégagement Z', content: 'G53 G0 Z-5' }, { id: 'bad' }, null], events: [] };
    const config = { get: (key) => ({ watchDirectory: root, macros: ctx.events.macros, events: ctx.events.events })[key] };
    const service = createService({ get: () => ctx.controllers }, config, () => ctx.now);
    const generation = service.list()[0].generation;
    service.openTransport('t');
    const req = (action, extra = {}) => service.action({ port: 'TEST', generation, transportId: 't', action, ...extra });

    let state = service.list()[0];
    expect(state.macros).toEqual([{ id: 'm1', name: 'Dégagement Z' }]);
    expect(JSON.stringify(state)).not.toContain('G53');
    expect(state.canMacro).toBe(false);
    expect(state.macroReason).toMatch(/trop ancien/);

    ctx.report();
    state = service.list()[0];
    expect(state.canMacro).toBe(true);
    await expect(req('prepare', { operation: 'macro', macroId: 'nope' })).rejects.toThrow(/introuvable/);
    await expect(req('macro', { nonce: 'x' })).rejects.toThrow(/expirée/);

    let ticket = await req('prepare', { operation: 'macro', macroId: 'm1' });
    expect(ticket.name).toBe('Dégagement Z');
    expect(ticket.operation).toBe('macro');
    ctx.now += 16000;
    ctx.report();
    await expect(req('macro', { nonce: ticket.nonce })).rejects.toThrow(/expirée/);
    expect(ctx.c.commands).toEqual([]);

    ticket = await req('prepare', { operation: 'macro', macroId: 'm1' });
    ctx.c.state.status.activeState = 'Alarm';
    await expect(req('macro', { nonce: ticket.nonce })).rejects.toThrow(/repos/);
    ctx.c.state.status.activeState = 'Idle';

    ticket = await req('prepare', { operation: 'macro', macroId: 'm1' });
    ctx.c.command = (name, ...args) => {
      ctx.c.commands.push([name, args[0]]);
      args[2](null);
    };
    expect((await req('macro', { nonce: ticket.nonce })).message).toMatch(/Dégagement Z/);
    expect(ctx.c.commands).toEqual([['macro:run', 'm1']]);
    await expect(req('macro', { nonce: ticket.nonce })).rejects.toThrow(/expirée/);

    // A start ticket cannot run a macro and a macro ticket cannot start a program.
    ctx.events.events = [{ enabled: true }];
    expect(service.list()[0].canMacro).toBe(false);
    expect(service.list()[0].macroReason).toMatch(/automatismes/i);
  });

  test('the snapshot reports the probe input from raw status reports', () => {
    const ctx = setup();
    expect(ctx.state().probeInput.state).toBe('unknown');
    ctx.c.runner.emit('status', { raw: '<Idle|MPos:0,0,0|Pn:P>' });
    expect(ctx.state().probeInput.state).toBe('contact');
    expect(ctx.state().probeInput.canProbe).toBe(false);
  });
});
