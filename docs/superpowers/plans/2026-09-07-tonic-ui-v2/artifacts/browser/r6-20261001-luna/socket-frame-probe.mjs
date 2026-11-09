import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '/tmp/cncjs-r6-playwright/node_modules/playwright/index.mjs';

const artifactDir = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await context.newPage();
page.setDefaultTimeout(10000);
const frames = [];
const pollingFrames = [];
const sockets = [];
const summarize = (direction, payload) => {
  const packet = String(payload || '');
  const eventMatch = packet.match(/^42(\d*)(\[.*\])$/s);
  if (eventMatch) {
    let args;
    try { args = JSON.parse(eventMatch[2]); } catch (_) { return; }
    if (Array.isArray(args) && typeof args[0] === 'string') {
      frames.push({ direction, type: 'event', name: args[0], ackId: eventMatch[1] || null });
    }
    return;
  }
  const ackMatch = packet.match(/^43(\d+)(\[.*\])$/s);
  if (ackMatch) {
    let args;
    try { args = JSON.parse(ackMatch[2]); } catch (_) { return; }
    const summary = { direction, type: 'ack', ackId: ackMatch[1], argCount: args?.length || 0, firstArgType: typeof args?.[0] };
    if (Array.isArray(args?.[1])) {
      summary.secondArgArrayLength = args[1].length;
      summary.hasSyntheticGrblPath = args[1].some(item => item?.path === '/tmp/ttyGRBL' && item?.manufacturer === 'Grbl Simulator');
    }
    frames.push(summary);
  }
};
context.on('websocket', socket => {
  const id = `socket-${sockets.length + 1}`;
  sockets.push(id);
  socket.on('framesent', event => summarize('sent', event.payload));
  socket.on('framereceived', event => summarize('received', event.payload));
});
const decodePollingPayload = (payload) => {
  const packets = [];
  let cursor = 0;
  while (cursor < payload.length) {
    const colon = payload.indexOf(':', cursor);
    if (colon > cursor && /^\d+$/.test(payload.slice(cursor, colon))) {
      const byteLength = Number(payload.slice(cursor, colon));
      const start = colon + 1;
      const packet = payload.slice(start, start + byteLength);
      if (packet.length !== byteLength) break;
      packets.push(packet);
      cursor = start + byteLength;
      continue;
    }
    const separator = payload.indexOf('\x1e', cursor);
    packets.push(payload.slice(cursor, separator < 0 ? payload.length : separator));
    if (separator < 0) break;
    cursor = separator + 1;
  }
  return packets;
};
page.on('response', async (response) => {
  let pathname;
  try { pathname = new URL(response.url()).pathname; } catch (_) { return; }
  if (!pathname.endsWith('/socket.io/')) return;
  let payload;
  try { payload = await response.text(); } catch (_) { return; }
  for (const packet of decodePollingPayload(payload)) {
    const eventMatch = packet.match(/^42(\d*)(\[.*\])$/s);
    if (eventMatch) {
      let args;
      try { args = JSON.parse(eventMatch[2]); } catch (_) { continue; }
      if (Array.isArray(args) && typeof args[0] === 'string') {
        pollingFrames.push({ direction: 'received', type: 'event', name: args[0], ackId: eventMatch[1] || null });
      }
      continue;
    }
    const ackMatch = packet.match(/^43(\d+)(\[.*\])$/s);
    if (ackMatch) {
      let args;
      try { args = JSON.parse(ackMatch[2]); } catch (_) { continue; }
      const summary = { direction: 'received', type: 'ack', ackId: ackMatch[1], argCount: args?.length || 0, firstArgType: typeof args?.[0] };
      if (Array.isArray(args?.[1])) {
        summary.secondArgArrayLength = args[1].length;
        summary.hasSyntheticGrblPath = args[1].some(item => item?.path === '/tmp/ttyGRBL' && item?.manufacturer === 'Grbl Simulator');
      }
      pollingFrames.push(summary);
    }
  }
});
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(String(error)));
await page.goto('http://127.0.0.1:8080/#/workspace', { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.getByRole('region', { name: 'Connection widget' }).waitFor();
await page.waitForTimeout(5000);
const connection = page.getByRole('region', { name: 'Connection widget' });
const result = {
  browserVersion: browser.version(),
  sockets,
  frames,
  pollingFrames,
  serialPortMenuEnabled: await connection.getByRole('button', { name: 'Serial port', exact: true }).isEnabled(),
  connectionText: (await connection.innerText()).slice(0, 700),
  pageErrors,
};
fs.writeFileSync(path.join(artifactDir, 'socket-frame-probe.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
await browser.close();
