import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '/tmp/cncjs-r6-playwright/node_modules/playwright/index.mjs';

const artifactDir = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await context.newPage();
page.setDefaultTimeout(10000);
const cdp = await context.newCDPSession(page);
await cdp.send('Network.enable');
const sockets = new Map();
const packets = [];

const summarizePacket = (direction, requestId, raw) => {
  // Socket.IO v2 EVENT (42) / ACK (43) packets only. Never store websocket URLs,
  // handshake query strings, raw payloads, or auth token material.
  const eventMatch = raw.match(/^42(\d*)(\[.*\])$/s);
  if (eventMatch) {
    let values;
    try { values = JSON.parse(eventMatch[2]); } catch (_) { return; }
    if (!Array.isArray(values) || typeof values[0] !== 'string') return;
    if (!['getPorts', 'getBaudRates'].includes(values[0])) return;
    packets.push({ direction, socket: sockets.get(requestId), type: 'event', event: values[0], ackId: eventMatch[1] || null });
    return;
  }
  const ackMatch = raw.match(/^43(\d+)(\[.*\])$/s);
  if (!ackMatch) return;
  let values;
  try { values = JSON.parse(ackMatch[2]); } catch (_) { return; }
  const result = { direction, socket: sockets.get(requestId), type: 'ack', ackId: ackMatch[1], firstArgType: typeof values?.[0] };
  if (Array.isArray(values?.[1])) {
    result.arrayLength = values[1].length;
    result.hasSyntheticGrblPath = values[1].some(item => item?.path === '/tmp/ttyGRBL' && item?.manufacturer === 'Grbl Simulator');
  }
  packets.push(result);
};

cdp.on('Network.webSocketCreated', event => {
  if (!sockets.has(event.requestId)) sockets.set(event.requestId, `socket-${sockets.size + 1}`);
});
cdp.on('Network.webSocketFrameSent', event => summarizePacket('sent', event.requestId, event.response?.payloadData || ''));
cdp.on('Network.webSocketFrameReceived', event => summarizePacket('received', event.requestId, event.response?.payloadData || ''));

const pageErrors = [];
page.on('pageerror', error => pageErrors.push(String(error)));
await page.goto('http://127.0.0.1:8080/#/workspace', { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.getByText('Connection', { exact: true }).waitFor();
await page.waitForTimeout(8000);
const ui = await page.getByRole('region', { name: 'Connection widget' }).innerText();
const result = {
  browserVersion: browser.version(),
  waitMs: 8000,
  ui: {
    serialPortMenuEnabled: await page.getByRole('button', { name: 'Serial port', exact: true }).isEnabled(),
    containsSyntheticPortLabel: ui.includes('Grbl Simulator') || ui.includes('/tmp/ttyGRBL'),
    connectionRegionText: ui.slice(0, 700),
  },
  packets,
  pageErrors,
};
fs.writeFileSync(path.join(artifactDir, 'socket-ack-probe.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
await browser.close();
