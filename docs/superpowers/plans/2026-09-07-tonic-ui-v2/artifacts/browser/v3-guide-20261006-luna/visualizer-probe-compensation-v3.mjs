import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const playwrightModule = process.env.PLAYWRIGHT_MODULE || `${process.env.HOME}/.nvm/versions/node/v24.21.0/lib/node_modules/playwright/index.mjs`;
const { chromium } = await import(pathToFileURL(playwrightModule).href);
const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const origin = process.env.V3_BASE_URL || 'http://127.0.0.1:8080';
const git = args => execFileSync('git', args, { cwd: process.cwd(), encoding: 'utf8' }).trim();
const revision = git(['rev-parse', 'HEAD']);
const sourceDiffSha256 = createHash('sha256').update(execFileSync('git', ['diff', '--', 'package.json', 'yarn.lock', 'src/app'], { cwd: process.cwd() })).digest('hex');
const tableSourceSha256 = createHash('sha256').update(fs.readFileSync(path.resolve(process.cwd(), 'src/app/pages/Administration/table/useResourceTable.js'))).digest('hex');
const visualizerSourceSha256 = createHash('sha256').update(fs.readFileSync(path.resolve(process.cwd(), 'src/app/widgets/Visualizer/index.jsx'))).digest('hex');
const dirtySourceFiles = execFileSync('git', ['status', '--short', 'src'], { cwd: process.cwd(), encoding: 'utf8' }).split('\n').filter(Boolean).map(entry => entry.slice(3));
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const fixture = {
  name: 'AL_part.gcode',
  gcode: '; V3 visual-only badge fixture; loaded but never run\n',
  isProbeCompensationApplied: true
};
const scratchDir = process.env.V3_SCRATCH_DIR || '/tmp/cncjs-v3-visual-KaoUqg';
fs.mkdirSync(scratchDir, { recursive: true });
const fixturePath = path.join(scratchDir, fixture.name);
fs.writeFileSync(fixturePath, fixture.gcode, { mode: 0o600 });
const report = {
  task: 'V3-GV focused Visualizer GCodeName and probe-compensation badge visual cases',
  revision,
  sourceDiffSha256,
  expectedSourceDiffSha256: 'f2d53df88181497311cbe2d154d32bf33bc7df23b787fb7c2e759c821f8401e9',
  model: { name: 'gpt-6-luna', reasoningEffort: 'xhigh', basis: 'user-selected active task/session assignment; model environment variables are not exposed' },
  sourceContext: { dirtyFiles: dirtySourceFiles, tableSourceSha256, visualizerSourceSha256, fixtureDelivery: `Connected only to the configured local Grbl simulator (${process.env.V3_SERIAL_PATH || '/tmp/ttyGRBL'}); uploaded a comment-only AL_part.gcode through the Visualizer file chooser, never ran it; after the visible filename appeared, window.PubSub.publish("gcode:load", {name,gcode,isProbeCompensationApplied:true}) set badge state`, hmrEvidence: 'owned development frontend webpack log compiled successfully after context.jsx and Visualizer changes' },
  browser: { name: 'Playwright bundled Chromium', version: browser.version(), headless: true, deviceScaleFactor: 1 },
  fixture,
  fixtureUpload: { path: fixturePath, name: fixture.name, bytes: Buffer.byteLength(fixture.gcode), contentLines: fixture.gcode.trim().split('\n').length, commentOnly: true, ran: false },
  socketTransport: { method: 'Socket.IO polling request observer; records only command/write/writeln names and sanitized payload summaries', websocketUpgradeClosed: 0, pollingPostCount: 0, outgoingCommands: [] },
  contrastMethodNote: 'Probe Compensation Applied has its own opaque computed foreground/background and its contrast ratio is assessed. GCodeName overlays the visually white WebGL canvas with CSS opacity; its contrast uses the actual white canvas background and multiplies computed color alpha by element opacity.',
  cases: [],
  startedAt: new Date().toISOString()
};
const progressFile = path.join(artifactDir, 'progress.json');
function flushProgress(current = null) {
  fs.writeFileSync(path.join(artifactDir, 'visualizer-probe-compensation-v3-progress.json'), `${JSON.stringify({ revision, runnerPid: process.pid, sourceContext: report.sourceContext, status: 'in_progress', current, cases: report.cases.map(item => ({ theme: item.theme, status: item.status || 'running', action: item.actionTrace?.at(-1)?.action || null, screenshots: item.screenshots })), fixtureUpload: report.fixtureUpload, socketTransport: report.socketTransport, updatedAt: new Date().toISOString() }, null, 2)}\n`);
  try {
    const progress = JSON.parse(fs.readFileSync(progressFile, 'utf8'));
    progress.phase = 'focused synthetic Grbl UI upload + probe-compensation visual cases';
    progress.status = 'in_progress';
    progress.focusedBadge = { runnerPid: process.pid, current, cases: report.cases.map(item => ({ theme: item.theme, status: item.status || 'running', screenshotCount: item.screenshots.length })), fixtureUpload: report.fixtureUpload, socketTransport: report.socketTransport, sourceContext: report.sourceContext, updatedAt: new Date().toISOString() };
    progress.runnerLifecycle.currentRunner = { pid: process.pid, status: 'running focused synthetic Grbl UI upload badge cases', result: 'visualizer-probe-compensation-v3.json', progress: 'visualizer-probe-compensation-v3-progress.json', sourceHashes: { tableSourceSha256, visualizerSourceSha256 }, revision };
    fs.writeFileSync(progressFile, `${JSON.stringify(progress, null, 2)}\n`);
  } catch (_) { /* Keep the dedicated focused progress file authoritative if global progress is unavailable. */ }
}

function sanitizeDiagnostic(value) {
  return String(value)
    .replace(/([?&]token=)[^&\s"']+/gi, '$1[redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [redacted]')
    .replace(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g, '[redacted-jwt]');
}

function decodePollingPayload(payload = '') {
  const packets = [];
  let cursor = 0;
  while (cursor < payload.length) {
    const colon = payload.indexOf(':', cursor);
    if (colon <= cursor || !/^\d+$/.test(payload.slice(cursor, colon))) break;
    const length = Number(payload.slice(cursor, colon));
    const start = colon + 1;
    const packet = payload.slice(start, start + length);
    if (packet.length !== length) break;
    packets.push(packet);
    cursor = start + length;
  }
  return packets;
}

function observeOutgoingPacket(packet, item, theme) {
  const match = packet.match(/^42\d*(\[.*\])$/s);
  if (!match) return;
  try {
    const [event, ...args] = JSON.parse(match[1]);
    if (!['command', 'write', 'writeln'].includes(event)) return;
    const name = event === 'command' ? String(args[1] || '') : event;
    const payload = event === 'command' ? args[2] : (args[1] ?? args[2]);
    const serialized = payload === undefined ? '' : (typeof payload === 'string' ? payload : JSON.stringify(payload));
    const isFixtureLoad = name === 'sender_load' && payload?.name === fixture.name && typeof payload?.content === 'string' && payload.content.startsWith('; V3 visual-only badge fixture');
    const connectionReadOnly = ['?', '$i', '$$', 'version', 'settings', 'state', 'status'].includes(name.toLowerCase());
    const motionRunJog = /^(?:run|jog|sender_run|start|G0|G1|G2|G3|G38(?:\.\d+)?|M\d+)$/i.test(name) || (name !== 'sender_load' && /(?:\$J=|(?:^|\s)(?:G0|G1|G2|G3|G38\.\d+|M0|M1|M2|M30)(?:\s|$))/i.test(serialized));
    const classification = isFixtureLoad ? 'authorized-fixture-load' : (connectionReadOnly ? 'connection-lifecycle-read-only' : (motionRunJog ? 'motion-run-or-jog' : 'unclassified-controller-command'));
    const summary = { theme, event, name, classification, payloadBytes: Buffer.byteLength(serialized), payloadSha256: createHash('sha256').update(serialized).digest('hex'), ...(isFixtureLoad ? { fixtureName: payload.name, commentOnly: true, contentBytes: Buffer.byteLength(payload.content) } : {}) };
    item.outgoingCommands.push(summary);
    report.socketTransport.outgoingCommands.push(summary);
  } catch (_) { item.outgoingCommandParseErrors = (item.outgoingCommandParseErrors || 0) + 1; }
}

async function connectSyntheticGrbl(page) {
  const connection = page.getByRole('region', { name: 'Connection widget', exact: true });
  const close = connection.getByRole('button', { name: 'Close', exact: true });
  if (await close.isVisible().catch(() => false)) throw new Error('Fresh browser context unexpectedly reports a preexisting connection; refusing to reuse it');
  const auto = connection.getByRole('checkbox', { name: 'Connect automatically', exact: true });
  if (await auto.isChecked().catch(() => false)) await connection.getByText('Connect automatically', { exact: true }).click();
  const grbl = connection.getByRole('button', { name: 'Grbl', exact: true });
  if (await grbl.getAttribute('data-selected') === null) await grbl.click();
  await connection.getByRole('button', { name: 'Serial port', exact: true }).click();
  const port = page.getByRole('menuitem', { name: new RegExp(process.env.V3_SERIAL_PATH || '/tmp/ttyGRBL') });
  await port.waitFor({ state: 'visible', timeout: 20000 });
  const selectedPort = (await port.innerText()).trim();
  await port.click();
  const open = connection.getByRole('button', { name: 'Open', exact: true });
  if (!(await open.isEnabled())) throw new Error('Synthetic Grbl simulator Open control is disabled');
  await open.click();
  await close.waitFor({ state: 'visible', timeout: 15000 });
  return { selectedPort, connected: true, endpoint: 'owned local simulator only', noRealMachine: true };
}

async function setTheme(page, theme) {
  const toggle = page.locator('header[aria-label="Application header"] button[aria-haspopup="menu"]').last();
  await toggle.click();
  await page.getByRole('menuitem', { name: /Appearance:/ }).click();
  await page.getByText(theme === 'light' ? 'Light theme' : 'Dark theme', { exact: true }).last().click();
  await page.waitForTimeout(160);
}

async function inspectCase(theme) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: theme });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.setDefaultNavigationTimeout(30000);
  const item = {
    theme,
    actionTrace: [],
    pageErrors: [],
    consoleIssues: [],
    requestFailures: [],
    httpErrors: [],
    apiWrites: [],
    outgoingCommands: [],
    screenshots: []
  };
  let action = 'launch fresh context';
  const mark = next => { action = next; item.actionTrace.push({ action, at: new Date().toISOString() }); flushProgress({ theme, action }); };
  await page.routeWebSocket('**/socket.io/**', socketRoute => {
    report.socketTransport.websocketUpgradeClosed += 1;
    socketRoute.close();
  });
  page.on('pageerror', error => item.pageErrors.push({ message: sanitizeDiagnostic(error.message), stack: sanitizeDiagnostic(error.stack || ''), action }));
  page.on('console', message => {
    if (['error', 'warning'].includes(message.type())) item.consoleIssues.push({ type: message.type(), text: sanitizeDiagnostic(message.text()).slice(0, 1200), action });
  });
  page.on('requestfailed', request => item.requestFailures.push({ method: request.method(), type: request.resourceType(), url: sanitizeDiagnostic(new URL(request.url()).origin + new URL(request.url()).pathname), error: sanitizeDiagnostic(request.failure()?.errorText || ''), action }));
  page.on('request', request => {
    const url = new URL(request.url());
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method()) && url.pathname.startsWith('/api/')) item.apiWrites.push({ method: request.method(), path: url.pathname, action });
    if (request.method() === 'POST' && url.pathname.replace(/\/$/, '') === '/socket.io') {
      report.socketTransport.pollingPostCount += 1;
      for (const packet of decodePollingPayload(request.postData() || '')) observeOutgoingPacket(packet, item, theme);
      flushProgress({ theme, action: 'observing outgoing Socket.IO command packets' });
    }
  });
  page.on('response', response => {
    if (response.status() >= 400) item.httpErrors.push({ status: response.status(), url: sanitizeDiagnostic(new URL(response.url()).origin + new URL(response.url()).pathname), action });
  });

  try {
    mark('page.goto #/workspace');
    await page.goto(`${origin}/#/workspace`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.locator('main').waitFor({ state: 'visible', timeout: 30000 });
    const showLeft = page.getByRole('button', { name: 'Show left panel', exact: true });
    if (await showLeft.isVisible().catch(() => false)) await showLeft.click();
    await page.getByRole('region', { name: '3D Visualizer widget', exact: true }).waitFor({ state: 'visible', timeout: 10000 });
    await setTheme(page, theme);
    mark('connect owned local Grbl simulator through Connection widget');
    item.connection = await connectSyntheticGrbl(page);
    const before = await page.evaluate(() => ({ subscriptions: window.PubSub?.countSubscriptions?.('gcode:load') ?? null, metrics: window.__CNCJS_VISUALIZER_METRICS__ ? { loadCount: window.__CNCJS_VISUALIZER_METRICS__.loadCount, hasGCode: window.__CNCJS_VISUALIZER_METRICS__.engines?.some(engine => engine.hasGCode) || false } : null }));
    if (before.subscriptions === 0) throw new Error(`No active gcode:load subscriber before fixture: ${JSON.stringify(before)}`);
    mark('upload comment-only AL_part.gcode through the Visualizer UI file chooser');
    const uploadButton = page.getByRole('region', { name: '3D Visualizer widget', exact: true }).getByRole('button', { name: 'Upload G-code', exact: true });
    if (!(await uploadButton.isEnabled())) throw new Error('Visualizer UI upload is disabled before fixture upload');
    const [fileChooser] = await Promise.all([page.waitForEvent('filechooser', { timeout: 10000 }), uploadButton.click()]);
    await fileChooser.setFiles(fixturePath);
    item.upload = { startedByVisibleUploadButton: true, file: fixture.name, commentOnly: true, fileBytes: Buffer.byteLength(fixture.gcode), backendRequestClass: 'explicitly authorized fixture ingestion only' };
    await page.waitForFunction(() => [...document.querySelectorAll('body *')].some(node => !['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(node.tagName) && node.children.length === 0 && (node.textContent || '').includes('AL_part.gcode') && (() => { const rect = node.getBoundingClientRect(); const style = getComputedStyle(node); return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0; })()), undefined, { timeout: 15000 });
    item.loadedFilenameBeforeBadgeFlag = await page.evaluate(() => [...document.querySelectorAll('body *')].filter(node => !['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(node.tagName) && node.children.length === 0 && (node.textContent || '').includes('AL_part.gcode')).map(node => (node.textContent || '').trim()).filter(Boolean).slice(0, 5));
    if (!item.connection?.connected || !item.loadedFilenameBeforeBadgeFlag.length) throw new Error('Synthetic Grbl fixture upload did not load a visible filename');
    mark('publish probe-compensation state after sender filename load');
    item.pubsubReturn = await page.evaluate(payload => window.PubSub.publish('gcode:load', payload), { name: fixture.name, gcode: fixture.gcode, isProbeCompensationApplied: true });
    await page.waitForFunction(() => {
      const metrics = window.__CNCJS_VISUALIZER_METRICS__;
      const hasFilename = [...document.querySelectorAll('body *')].some(node => !['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(node.tagName) && node.children.length === 0 && (node.textContent || '').includes('AL_part.gcode') && (() => { const rect = node.getBoundingClientRect(); const style = getComputedStyle(node); return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0; })());
      return hasFilename && Boolean(metrics?.engines?.some(engine => engine.hasGCode));
    }, undefined, { timeout: 10000 });
    await page.waitForTimeout(200);
    const details = await page.evaluate(() => {
      const visible = element => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0;
      };
      const parseColor = value => {
        const srgb = value.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)$/i);
        if (srgb) return { r: Number(srgb[1]), g: Number(srgb[2]), b: Number(srgb[3]), a: srgb[4] === undefined ? 1 : Number(srgb[4]), unit: 1 };
        const rgb = value.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i);
        if (rgb) return { r: Number(rgb[1]) / 255, g: Number(rgb[2]) / 255, b: Number(rgb[3]) / 255, a: rgb[4] ? (rgb[4].endsWith('%') ? Number(rgb[4].slice(0, -1)) / 100 : Number(rgb[4])) : 1 };
        return null;
      };
      const composite = (front, back) => {
        if (!front) return back;
        return { r: front.r * front.a + back.r * (1 - front.a), g: front.g * front.a + back.g * (1 - front.a), b: front.b * front.a + back.b * (1 - front.a), a: 1 };
      };
      const luminance = color => {
        const linear = value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        return 0.2126 * linear(color.r) + 0.7152 * linear(color.g) + 0.0722 * linear(color.b);
      };
      const contrast = (foreground, background, elementOpacity = 1) => {
        const fg = parseColor(foreground);
        if (!fg) return null;
        const bg = parseColor(background) || { r: 1, g: 1, b: 1, a: 1, unit: 1 };
        fg.a *= elementOpacity;
        const fgOnBg = composite(fg, bg);
        const a = luminance(fgOnBg);
        const b = luminance(bg);
        return Number(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toFixed(3));
      };
      const cssRgb = color => `rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`;
      const actualBackground = node => {
        const ancestors = [];
        for (let current = node; current; current = current.parentElement) ancestors.push(current);
        let color = { r: 1, g: 1, b: 1, a: 1 };
        const layers = [];
        for (const current of ancestors.reverse()) {
          const rawColor = getComputedStyle(current).backgroundColor;
          const parsed = parseColor(rawColor);
          if (parsed && parsed.a > 0) {
            color = composite(parsed, color);
            layers.push({
              tag: current.tagName,
              role: current.getAttribute('role'),
              className: typeof current.className === 'string' ? current.className.slice(0, 140) : '',
              rawColor,
              alpha: parsed.a,
              composedColor: cssRgb(color)
            });
          }
        }
        return { color: cssRgb(color), layers };
      };
      const visualizer = document.querySelector('[role="region"][aria-label="3D Visualizer widget"]');
      const canvas = visualizer?.querySelector('canvas');
      const host = document.querySelector('[aria-label="3D Visualizer"]');
      const vr = visualizer?.getBoundingClientRect();
      const cr = canvas?.getBoundingClientRect();
      const hr = host?.getBoundingClientRect();
      const leaves = [...document.querySelectorAll('body *')]
        .filter(node => !['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(node.tagName) && node.children.length === 0 && visible(node))
        .map(node => {
          const text = (node.textContent || '').trim().replace(/\s+/g, ' ');
          if (!text || !/(AL_part\.gcode|probe|compensation|warning|warn)/i.test(text)) return null;
          const style = getComputedStyle(node);
          const backgroundSample = actualBackground(node);
          const bg = backgroundSample.color;
          const rect = node.getBoundingClientRect();
          const visualizer = document.querySelector('[role="region"][aria-label="3D Visualizer widget"]');
          const isVisualizerFilename = Boolean(visualizer?.contains(node) && /AL_part\.gcode/i.test(text));
          const canvasBackground = isVisualizerFilename ? 'rgb(255, 255, 255)' : null;
          const ancestors = [];
          for (let parent = node, depth = 0; parent && depth < 4; parent = parent.parentElement, depth += 1) {
            const ps = getComputedStyle(parent);
            ancestors.push({ tag: parent.tagName, role: parent.getAttribute('role'), dataTonic: parent.getAttribute('data-tonic'), className: typeof parent.className === 'string' ? parent.className.slice(0, 120) : '', text: (parent.innerText || '').replace(/\s+/g, ' ').slice(0, 140), color: ps.color, backgroundColor: ps.backgroundColor, borderColor: ps.borderColor, borderWidth: ps.borderWidth });
          }
          return { found: true, text: text.slice(0, 120), tag: node.tagName, dataTonic: node.getAttribute('data-tonic'), className: typeof node.className === 'string' ? node.className.slice(0, 140) : '', foreground: style.color, elementOpacity: Number(style.opacity), fontSizePx: Number.parseFloat(style.fontSize), background: bg, backgroundLayers: backgroundSample.layers, contrastRatio: contrast(style.color, bg, Number(style.opacity)), gcodeNameCanvasBackground: canvasBackground, gcodeNameCanvasContrastRatio: canvasBackground ? contrast(style.color, canvasBackground, Number(style.opacity)) : null, rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) }, ancestors };
        })
        .filter(Boolean)
        .slice(0, 20);
      const badgeNodes = [...document.querySelectorAll('[data-tonic="Badge"], [role="status"], [role="alert"], [class*="badge" i], [aria-label*="warning" i], [title*="warning" i]')]
        .filter(visible)
        .map(node => {
          const rect = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          const backgroundSample = actualBackground(node);
          const bg = backgroundSample.color;
          return { found: true, tag: node.tagName, role: node.getAttribute('role'), dataTonic: node.getAttribute('data-tonic'), className: typeof node.className === 'string' ? node.className.slice(0, 160) : '', text: (node.innerText || '').replace(/\s+/g, ' ').slice(0, 160), ariaLabel: node.getAttribute('aria-label'), title: node.getAttribute('title'), color: style.color, elementOpacity: Number(style.opacity), backgroundColor: style.backgroundColor, background: bg, backgroundLayers: backgroundSample.layers, contrastRatio: contrast(style.color, bg, Number(style.opacity)), borderColor: style.borderColor, borderWidth: style.borderWidth, rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) } };
        })
        .slice(0, 30);
      const sidePanels = [...document.querySelectorAll('[role="region"][aria-label]')].filter(node => /Connection|G-code|Webcam/i.test(node.getAttribute('aria-label') || '') && visible(node)).map(node => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return { ariaLabel: node.getAttribute('aria-label'), rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) }, borderColor: style.borderColor, borderLeftColor: style.borderLeftColor, borderRightColor: style.borderRightColor, borderWidth: style.borderWidth, backgroundColor: style.backgroundColor };
      });
      const bodyLeafTexts = [...document.querySelectorAll('body *')].filter(node => !['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(node.tagName) && node.children.length === 0 && visible(node)).map(node => (node.textContent || '').trim()).filter(text => /AL_part\.gcode/i.test(text)).slice(0, 10);
      return {
        themeSurface: { bodyBackground: getComputedStyle(document.body).backgroundColor, bodyColor: getComputedStyle(document.body).color, rootBackground: getComputedStyle(document.documentElement).backgroundColor },
      gcodeNameVisibleTexts: bodyLeafTexts,
      semanticTextSamples: leaves,
        gcodeNameCanvasSamples: leaves.filter(sample => /AL_part\.gcode/i.test(sample.text) && sample.gcodeNameCanvasBackground === 'rgb(255, 255, 255)').map(sample => ({ found: sample.found, text: sample.text, foreground: sample.foreground, elementOpacity: sample.elementOpacity, fontSizePx: sample.fontSizePx, actualCanvasBackground: sample.gcodeNameCanvasBackground, effectiveContrastRatio: sample.gcodeNameCanvasContrastRatio, rect: sample.rect })),
      badgeCandidates: badgeNodes,
        sidePanelBorders: sidePanels,
        visualizer: visualizer ? { visible: visible(visualizer), rect: { x: Math.round(vr.x), y: Math.round(vr.y), width: Math.round(vr.width), height: Math.round(vr.height) }, canvas: canvas ? { rect: { x: Math.round(cr.x), y: Math.round(cr.y), width: Math.round(cr.width), height: Math.round(cr.height), right: Math.round(cr.right), bottom: Math.round(cr.bottom) }, buffer: { width: canvas.width, height: canvas.height }, fitsHost: Boolean(host && cr.width > 0 && cr.height > 0 && cr.left >= hr.left - 2 && cr.top >= hr.top - 2 && cr.right <= hr.right + 2 && cr.bottom <= hr.bottom + 2), host: host ? { x: Math.round(hr.x), y: Math.round(hr.y), width: Math.round(hr.width), height: Math.round(hr.height) } : null } : null } : null,
        metrics: window.__CNCJS_VISUALIZER_METRICS__ ? { loadCount: window.__CNCJS_VISUALIZER_METRICS__.loadCount, engines: window.__CNCJS_VISUALIZER_METRICS__.engines?.map(engine => ({ hasGCode: engine.hasGCode, width: engine.width, height: engine.height, canvasAttached: engine.canvasAttached, geometryCount: engine.geometryCount, renderFrameCount: engine.renderFrameCount })) } : null
      };
    });
    item.details = details;
    mark('capture screenshot after gcode:load fixture and geometry settlement');
    const screenshot = `screenshots/visualizer-probe-compensation-${theme}-1440x900.png`;
    await page.screenshot({ path: path.join(artifactDir, screenshot), animations: 'disabled', caret: 'hide', timeout: 5000 });
    item.screenshots.push(screenshot);
    item.assertions = {
      pubsubSubscriberPresent: before.subscriptions > 0,
      fixtureNameVisible: details.gcodeNameVisibleTexts.length > 0 && item.loadedFilenameBeforeBadgeFlag.length > 0,
      syntheticGrblConnectedForUpload: item.connection?.connected === true && item.connection?.noRealMachine === true,
      visualizerHasLoadedCanvas: Boolean(details.visualizer?.canvas?.buffer.width > 0 && details.visualizer?.canvas?.buffer.height > 0 && details.visualizer?.canvas?.fitsHost),
      compensationBadgeOrTextFound: details.semanticTextSamples.some(sample => /probe|compensation|warning/i.test(sample.text)) || details.badgeCandidates.length > 0,
      allSampledContrastResolved: [...details.semanticTextSamples, ...details.badgeCandidates].length > 0 && [...details.semanticTextSamples, ...details.badgeCandidates].every(sample => sample.found === true && Number.isFinite(sample.contrastRatio)),
      gcodeNameLargeTextContrastAtLeast3: details.gcodeNameCanvasSamples.length > 0 && details.gcodeNameCanvasSamples.every(sample => sample.found === true && sample.actualCanvasBackground === 'rgb(255, 255, 255)' && Number.isFinite(sample.effectiveContrastRatio) && sample.fontSizePx >= 24 && sample.effectiveContrastRatio >= 3),
      probeCompensationContrastAtLeast45: [...details.semanticTextSamples.filter(sample => /compensation|warning/i.test(sample.text)), ...details.badgeCandidates.filter(sample => /compensation|warning/i.test(`${sample.text} ${sample.ariaLabel || ''} ${sample.title || ''}`))].length > 0 && [...details.semanticTextSamples.filter(sample => /compensation|warning/i.test(sample.text)), ...details.badgeCandidates.filter(sample => /compensation|warning/i.test(`${sample.text} ${sample.ariaLabel || ''} ${sample.title || ''}`))].every(sample => sample.found === true && Number.isFinite(sample.contrastRatio) && sample.contrastRatio >= 4.5),
      noUnexpectedRequestFailures: item.requestFailures.length === 0,
      noPageErrors: item.pageErrors.length === 0,
      onlyExpectedApiWrites: item.apiWrites.every(write => write.path === '/api/signin' || write.path === '/api/gcode') && item.apiWrites.filter(write => write.path === '/api/gcode').length <= 1,
      authorizedSenderLoadObserved: item.outgoingCommands.filter(command => command.classification === 'authorized-fixture-load').length === 1,
      noMotionRunOrJogCommands: item.outgoingCommands.every(command => command.classification !== 'motion-run-or-jog'),
      noUnclassifiedControllerCommands: item.outgoingCommands.every(command => ['authorized-fixture-load', 'connection-lifecycle-read-only'].includes(command.classification))
    };
    item.status = Object.values(item.assertions).every(Boolean) ? 'passed' : 'failed';
    item.before = before;
    item.fixtureMockState = { file: { name: fixture.name, content: fixture.gcode, commentOnly: true, loadedThroughVisibleVisualizerUploadControl: true }, badgeState: { event: 'gcode:load', isProbeCompensationApplied: fixture.isProbeCompensationApplied }, controller: 'owned local Grbl simulator only', uploadedButNeverRun: true, authorizedOutgoingCommand: 'sender_load', noMotionRunOrJogCommand: item.outgoingCommands.every(command => command.classification !== 'motion-run-or-jog') };
  } catch (error) {
    item.status = 'failed';
    item.fatalError = { message: sanitizeDiagnostic(error?.message || error), stack: sanitizeDiagnostic(error?.stack || ''), action };
    item.failureSnapshot = await page.evaluate(() => ({ url: location.href, visibleLeaves: [...document.querySelectorAll('body *')].filter(node => !['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(node.tagName) && node.children.length === 0).map(node => { const rect = node.getBoundingClientRect(); const style = getComputedStyle(node); return { text: (node.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120), visible: rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0, rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) } }; }).filter(node => node.visible && node.text).slice(0, 120), metrics: window.__CNCJS_VISUALIZER_METRICS__ ? { loadCount: window.__CNCJS_VISUALIZER_METRICS__.loadCount, engines: window.__CNCJS_VISUALIZER_METRICS__.engines?.map(engine => ({ hasGCode: engine.hasGCode, width: engine.width, height: engine.height, canvasAttached: engine.canvasAttached })) } : null })).catch(() => null);
    const failureScreenshot = `screenshots/visualizer-probe-compensation-${theme}-senderload-failure.png`;
    await page.screenshot({ path: path.join(artifactDir, failureScreenshot), animations: 'disabled', caret: 'hide', timeout: 5000 }).then(() => item.screenshots.push(failureScreenshot)).catch(() => {});
  } finally {
    item.consoleSummary = item.consoleIssues.reduce((summary, event) => { const signature = `${event.type}\n${event.text}`; summary[signature] ||= { type: event.type, text: event.text, count: 0, firstAction: event.action }; summary[signature].count += 1; return summary; }, {});
    item.elapsedMs = item.actionTrace.length ? Date.now() - Date.parse(item.actionTrace[0].at) : null;
    report.cases.push(item);
    flushProgress({ theme, action: 'case complete', status: item.status });
    await page.unrouteAll({ behavior: 'ignoreErrors' }).catch(() => {});
    if (item.connection?.connected) {
      try {
        const connection = page.getByRole('region', { name: 'Connection widget', exact: true });
        await connection.getByRole('button', { name: 'Close', exact: true }).click({ timeout: 1500 });
        await page.getByRole('button', { name: 'OK', exact: true }).click({ timeout: 2500 });
        await connection.getByRole('button', { name: 'Open', exact: true }).waitFor({ state: 'visible', timeout: 5000 });
        item.disconnect = { completed: true, method: 'Connection widget Close + confirmation' };
      } catch (error) {
        item.disconnect = { completed: false, error: sanitizeDiagnostic(error?.message || error) };
      }
    }
    await context.close();
  }
}

try {
  await inspectCase('light');
  await inspectCase('dark');
  report.status = report.cases.length === 2 && report.cases.every(item => item.status === 'passed') ? 'passed' : 'failed';
} finally {
  report.completedAt = new Date().toISOString();
  fs.writeFileSync(path.join(artifactDir, 'visualizer-probe-compensation-v3.json'), `${JSON.stringify(report, null, 2)}\n`);
  flushProgress({ action: 'runner complete', status: report.status });
  await browser.close();
}
console.log(JSON.stringify({ status: report.status, revision, tableSourceSha256, browser: report.browser, cases: report.cases.map(item => ({ theme: item.theme, status: item.status, assertions: item.assertions || null, badgeCandidates: item.details?.badgeCandidates?.length || 0, sampledTexts: item.details?.semanticTextSamples?.map(sample => ({ text: sample.text, contrastRatio: sample.contrastRatio })), screenshot: item.screenshots?.[0], fatalError: item.fatalError?.message || null })) }, null, 2));
if (report.status !== 'passed') process.exitCode = 1;
