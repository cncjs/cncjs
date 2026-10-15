'use strict';
const assert = require('assert').strict;
const { EventEmitter } = require('events');
const { createPreflight } = require('./motion-preflight');
let now = 0, transportCalls = 0, events = [], session = { loading: false, confirmationPending: false };
const forbidden = () => { transportCalls++; throw new Error('Physical transport forbidden in this test'); };
function fake(port = 'TEST') {
  const state={status:{activeState:'Idle'}};
  return { type: 'Grbl', options: { port }, ready: true, isClose: () => false,
    runner: Object.assign(new EventEmitter(),{state}), workflow: { state: 'idle' }, state,
    feeder: { toJSON: () => ({ queue: 0, pending: false }) },
    settings: { settings: { '$110': '1600.000', '$111': 1600, '$112': 1600 } },
    command: forbidden, write: forbidden, writeln: forbidden, emit: forbidden };
}
let c = fake(), registry = { TEST: c };
const store = { get: () => registry }, config = { get: () => events };
assert.throws(() => createPreflight(store, config), /obligatoires/);
const service = createPreflight(store, config, () => session, () => now);
const input = { port: 'TEST', axis: 'X', direction: 1, step: 1, feed: 800 };
function reject(code, body = input) { assert.throws(() => service.preview(body), e => e.code === code); }
function change(target, key, value, code) {
  const original = target[key]; target[key] = value; reject(code); target[key] = original;
}
assert.equal(service.inspect('TEST').code, 'STALE');
assert.equal(c.runner.listenerCount('status'), 1);
service.inspect('TEST');
assert.equal(c.runner.listenerCount('status'), 1);
c.runner.emit('status'); // Timestamp zero is valid.
assert.equal(service.inspect('TEST').available, true);
let combinations = 0;
for (const axis of ['X', 'Y', 'Z']) for (const direction of [-1, 1]) {
  for (const step of [0.1, 1, 10]) for (const feed of [200, 800, 1500]) {
    const body = { ...input, axis, direction, step, feed }, before = JSON.stringify(body);
    const result = service.preview(body);
    assert.equal(result.gcode, `$J=G21 G91 ${axis}${direction * step} F${feed}`);
    assert.equal(result.dryRun, true); assert.equal(result.distanceMm, direction * step);
    assert.ok(Object.isFrozen(result)); assert.equal(JSON.stringify(body), before);
    combinations++;
  }
}
for (const body of [null, [], {}, { ...input, command: 'M3' }, { ...input, execute: true },
  { ...input, dryRun: false }, { ...input, axis: 'X\nM3' }, { ...input, axis: 'x' },
  { ...input, direction: '1' }, { ...input, direction: 0 }, { ...input, step: '1' },
  { ...input, step: -1 }, { ...input, step: Infinity }, { ...input, feed: NaN },
  { ...input, feed: '800' }, { ...input, feed: 0 }, { ...input, feed: 801 },
  Object.assign(Object.create(input), input), { ...input, [Symbol('extra')]: true }]) reject('INPUT', body);
reject('PORT', { ...input, port: 'TEST\nM3' });
reject('CONNECTION', { ...input, port: 'toString' });
reject('CONNECTION', { ...input, port: 'MISSING' });
now = 2500; assert.equal(service.inspect('TEST').available, true);
now = 2501; reject('STALE');
c.runner.emit('status'); now--; reject('STALE');
now = 3000; c.runner.emit('status');
for (const state of ['Alarm', 'Run', 'Hold', 'Door', 'Jog', 'Home', 'Sleep', '', undefined]) {
  change(c.state.status, 'activeState', state, 'BUSY');
}
// A native controller's display copy can lag its runner by 250 ms.
c.runner.state={status:{activeState:'Alarm'}};c.runner.emit('status');
assert.equal(c.state.status.activeState,'Idle');reject('BUSY');
c.runner.state={};c.runner.emit('status');reject('BUSY'); // Never fall back to stale Idle.
c.runner.state=c.state;
for (const state of ['running', 'paused', undefined]) change(c.workflow, 'state', state, 'BUSY');
for (const queue of [{ queue: 1, pending: false }, { queue: 0, pending: true }, {}, null]) {
  change(c.feeder, 'toJSON', () => queue, 'QUEUE');
}
for (const value of [{ loading: true, confirmationPending: false }, { loading: false, confirmationPending: true }, {}, null]) {
  const original = session; session = value; reject('SESSION'); session = original;
}
for (const value of [[{ enabled: true }], [{}], [null], null, {}]) {
  events = value; reject('EVENTS');
}
events = [{ enabled: false }]; assert.equal(service.inspect('TEST').available, true); events = [];
for (const value of [undefined, null, '', true, 0, -1, Infinity, 'Infinity', '1000junk']) {
  change(c.settings.settings, '$110', value, 'LIMIT');
}
change(c.settings.settings, '$110', 799, 'FEED');
c.settings.settings.$112 = 200;
assert.equal(service.preview({ ...input, axis: 'Z', feed: 200 }).feedMmMin, 200);
reject('FEED', { ...input, axis: 'Z', feed: 800 });
assert.equal(service.preview(input).feedMmMin, 800); // Z limit must not apply to X.
change(c.options, 'port', 'OTHER', 'CONNECTION');
assert.equal(service.inspect('TEST').code, 'STALE'); c.runner.emit('status');
change(c, 'ready', false, 'CONNECTION');
assert.equal(service.inspect('TEST').code, 'STALE'); c.runner.emit('status');
change(c, 'isClose', () => true, 'CONNECTION');
assert.equal(service.inspect('TEST').code, 'STALE'); c.runner.emit('status');
const old = c; c = fake(); registry.TEST = c;
reject('STALE'); assert.equal(old.runner.listenerCount('status'), 0);
old.runner.emit('status'); reject('STALE');
c.runner.emit('status'); assert.equal(service.inspect('TEST').available, true);
registry = {}; reject('CONNECTION'); assert.equal(c.runner.listenerCount('status'), 0);
registry.TEST = c; reject('STALE'); c.runner.emit('status');
service.dispose(); service.dispose();
assert.equal(c.runner.listenerCount('status'), 0); reject('CLOSED');
const broken = createPreflight(store, config, () => { throw new Error('private information'); }, () => now);
broken.inspect('TEST'); c.runner.emit('status');
assert.deepEqual(broken.inspect('TEST'), { dryRun: true, available: false, code: 'UNAVAILABLE', reason: 'État serveur indisponible.' });
assert.throws(() => broken.preview(input)); broken.dispose();
assert.equal(transportCalls, 0);
assert.equal(old.workflow.state, 'idle'); assert.equal(c.workflow.state, 'idle');
console.log(`Motion preflight: ${combinations} combinations and blocking scenarios passed; 0 transport calls, fake controllers only.`);
