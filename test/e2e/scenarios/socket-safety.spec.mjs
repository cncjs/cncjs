import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { test, expect } from '@playwright/test';
import { installApiGuard } from '../support/api-guard.mjs';
import { installSocketGuard } from '../support/socket-guard.mjs';

const require = createRequire(import.meta.url);
const socketIO = require('socket.io');

// These tests use a private HTTP server; no CNCjs backend or controller is involved.
test('socket guard rejects unapproved controller events before they reach the backend', async ({ context, page }) => {
  const received = [];
  const server = createServer((request, response) => {
    if (request.url.startsWith('/socket.io/')) {
      received.push(request.method);
    }
    response.end('ok');
  });
  await new Promise(resolve => {
    server.listen(0, '127.0.0.1', resolve);
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    const guard = await installSocketGuard(context, origin);
    await page.goto(origin);
    const send = packet => page.evaluate(async value => {
      try {
        const response = await fetch('/socket.io/?EIO=3&transport=polling', {
          method: 'POST', body: `${value.length}:${value}`,
        });
        return response.ok;
      } catch {
        return false;
      }
    }, packet);
    expect(await send('42["getPorts"]')).toBe(true);
    expect(await send('42["open","Grbl","serial",{"path":"/dev/unsafe"}]')).toBe(false);
    expect(await send('42["command","other-controller","gcode","G0 X1"]')).toBe(false);
    expect(received).toEqual(['POST']);
    expect(guard.violations).toEqual(['blocked Socket.IO polling packet', 'blocked Socket.IO polling packet']);
  } finally {
    await page.close();
    await context.unrouteAll({ behavior: 'wait' });
    await new Promise(resolve => {
      server.close(resolve);
    });
  }
});

test('socket guard blocks controller events over WebSocket', async ({ context, page }) => {
  const packets = [];
  const server = createServer((request, response) => response.end('ok'));
  const io = socketIO(server, { transports: ['websocket'] });
  io.engine.on('connection', socket => socket.on('packet', packet => packets.push(packet.data)));
  await new Promise(resolve => {
    server.listen(0, '127.0.0.1', resolve);
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    const guard = await installSocketGuard(context, origin);
    await page.goto(origin);
    await page.evaluate(() => new Promise((resolve, reject) => {
      const socket = new WebSocket(`ws://${window.location.host}/socket.io/?EIO=3&transport=websocket`);
      socket.onopen = () => socket.send('42["open","Grbl","serial",{"path":"/dev/unsafe"}]');
      socket.onclose = resolve;
      socket.onerror = reject;
    }));
    expect(packets).toEqual([]);
    expect(guard.violations).toEqual(['blocked Socket.IO WebSocket packet']);
  } finally {
    await page.close();
    await context.unrouteAll({ behavior: 'wait' });
    await new Promise(resolve => {
      io.close(resolve);
    });
  }
});

test('API guard permits G-code uploads only for the approved simulator identity', async ({ context, page }) => {
  const received = [];
  const server = createServer((request, response) => {
    if (request.url === '/api/gcode') {
      received.push(request.method);
    }
    response.end('ok');
  });
  await new Promise(resolve => {
    server.listen(0, '127.0.0.1', resolve);
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const policy = { ident: null };
  try {
    const forbidden = await installApiGuard(context, origin, policy);
    await page.goto(origin);
    const upload = body => page.evaluate(async value => {
      try {
        const response = await fetch('/api/gcode', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: value,
        });
        return response.ok;
      } catch {
        return false;
      }
    }, body);
    expect(await upload(JSON.stringify({ ident: 'simulator' }))).toBe(false);
    policy.ident = 'simulator';
    expect(await upload(JSON.stringify({ ident: 'other' }))).toBe(false);
    expect(await upload('not-json')).toBe(false);
    expect(await upload(JSON.stringify({ ident: 'simulator' }))).toBe(true);
    policy.ident = null;
    expect(await upload(JSON.stringify({ ident: 'simulator' }))).toBe(false);
    expect(received).toEqual(['POST']);
    expect(forbidden).toEqual(Array(4).fill('POST /api/gcode'));
  } finally {
    await page.close();
    await context.unrouteAll({ behavior: 'wait' });
    await new Promise(resolve => {
      server.close(resolve);
    });
  }
});
