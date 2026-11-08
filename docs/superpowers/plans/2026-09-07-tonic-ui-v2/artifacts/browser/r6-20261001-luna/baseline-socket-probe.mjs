import fs from 'node:fs';
import path from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/tmp/cncjs-r6-playwright/node_modules/playwright/index.mjs');
const artifactDir = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const result = { browser: browser.version(), frontend: 'http://127.0.0.1:8082', websocket: [], socketHttp: [], api: [], pageErrors: [], consoleErrors: [] };
function frameSummary(data) {
  let raw = data;
  if (typeof data !== 'string') {
    try { raw = Buffer.isBuffer(data) ? data.toString('utf8') : Buffer.from(data).toString('utf8'); }
    catch (_) { return { kind: 'binary', bytes: data?.byteLength || data?.length || 0 }; }
  }
  if (typeof raw !== 'string') return { kind: 'binary', bytes: data?.byteLength || data?.length || 0 };
  if (raw.startsWith('d=')) raw = new URLSearchParams(raw).get('d') || raw;
  const packets = [];
  let cursor = 0;
  while (cursor < raw.length) {
    const colon = raw.indexOf(':', cursor);
    if (colon > cursor && /^\d+$/.test(raw.slice(cursor, colon))) {
      const length = Number(raw.slice(cursor, colon));
      const start = colon + 1;
      const packet = raw.slice(start, start + length);
      if (packet.length !== length) break;
      packets.push(packet);
      cursor = start + length;
      continue;
    }
    const separator = raw.indexOf('\x1e', cursor);
    packets.push(raw.slice(cursor, separator < 0 ? raw.length : separator));
    if (separator < 0) break;
    cursor = separator + 1;
  }
  const summaries = [];
  for (const packet of packets) {
    if (!packet) continue;
    if (packet.startsWith('42')) {
      try { summaries.push({ kind: 'event', name: JSON.parse(packet.slice(2).replace(/^\d*/, ''))[0] }); }
      catch (_) { summaries.push({ kind: 'event-frame-unparsed' }); }
    } else if (packet.startsWith('43')) {
      const match = packet.slice(2).match(/^(\d+)(\[.*\])$/s);
      if (!match) summaries.push({ kind: 'ack', id: packet.slice(2).match(/^\d+/)?.[0] || '' });
      else {
        try {
          const args = JSON.parse(match[2]);
          const data = args.at(-1);
          summaries.push({ kind: 'ack', id: match[1], error: Boolean(args[0]), resultCount: Array.isArray(data) ? data.length : null });
        } catch (_) { summaries.push({ kind: 'ack', id: match[1], payload: 'unparsed' }); }
      }
    }
    else if (/^\d/.test(packet)) summaries.push({ kind: 'protocol', packetType: packet.slice(0, 2) });
  }
  return summaries;
}
page.on('websocket', socket => {
  const url = new URL(socket.url());
  result.websocket.push({ event: 'opened', path: url.pathname, hasTokenQuery: url.searchParams.has('token') });
  socket.on('framesent', data => result.websocket.push({ direction: 'sent', frames: frameSummary(data) }));
  socket.on('framereceived', data => result.websocket.push({ direction: 'received', frames: frameSummary(data) }));
  socket.on('close', () => result.websocket.push({ event: 'closed' }));
  socket.on('socketerror', error => result.websocket.push({ event: 'error', message: String(error).slice(0, 300) }));
});
page.on('response', response => {
  const url = new URL(response.url());
  if (url.pathname.startsWith('/api/')) result.api.push({ method: response.request().method(), path: url.pathname, status: response.status() });
  if (url.pathname.includes('socket.io')) {
    response.body().then(body => result.socketHttp.push({ method: response.request().method(), path: url.pathname, status: response.status(), responseFrames: frameSummary(body) })).catch(() => {});
  }
});
page.on('request', request => {
  const url = new URL(request.url());
  if (url.pathname.includes('socket.io')) result.socketHttp.push({ method: request.method(), path: url.pathname, requestFrames: frameSummary(request.postData() || '') });
});
page.on('pageerror', error => result.pageErrors.push(String(error).slice(0, 800)));
page.on('console', message => { if (message.type() === 'error') result.consoleErrors.push(message.text().slice(0, 500)); });
try {
  await page.goto(`${result.frontend}/#/workspace`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.getByRole('region', { name: 'Connection widget', exact: true }).waitFor();
  await page.waitForTimeout(2000);
  const connection = page.getByRole('region', { name: 'Connection widget', exact: true });
  await connection.getByRole('button', { name: 'Refresh', exact: true }).first().click();
  await page.waitForTimeout(3000);
  result.state = await page.evaluate(() => ({
    hash: location.hash,
    baselineMetrics: window.__R6_BASELINE_METRICS__ ? { renders: window.__R6_BASELINE_METRICS__.renderSamples.length, loads: window.__R6_BASELINE_METRICS__.loadSamples.length } : null,
    connectionText: [...document.querySelectorAll('[role="region"][aria-label="Connection widget"]')].map(el => el.innerText.slice(0, 600)),
    selectText: document.querySelector('[data-test="connection-serial-port"]')?.innerText || '',
    openDisabled: [...document.querySelectorAll('button')].find(button => button.innerText.trim() === 'Open')?.disabled ?? null,
  }));
} catch (error) { result.error = String(error).slice(0, 1000); }
finally {
  fs.writeFileSync(path.join(artifactDir, 'baseline-socket-probe.json'), JSON.stringify(result, null, 2) + '\n');
  await browser.close();
}
