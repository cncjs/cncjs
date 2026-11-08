import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const playwrightModule = process.env.PLAYWRIGHT_MODULE || `${process.env.HOME}/.nvm/versions/node/v24.21.0/lib/node_modules/playwright/index.mjs`;
const { chromium } = await import(pathToFileURL(playwrightModule).href);
const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const screenshotDir = path.join(artifactDir, 'screenshots');
const progressPath = path.join(artifactDir, 'progress.json');
const resultPath = path.join(artifactDir, process.env.V3_RESULT_FILE || 'routes-semantic-v3-after-table-fix.json');
const runProgressPath = path.join(artifactDir, process.env.V3_RUN_PROGRESS_FILE || 'routes-semantic-v3-after-table-fix-progress.json');
const tableSourcePath = path.resolve(process.cwd(), 'src/app/pages/Administration/table/useResourceTable.js');
const tableSourceSha256 = createHash('sha256').update(fs.readFileSync(tableSourcePath)).digest('hex');
const revision = 'f050804ef6b485b0190f29557d79df43f53316b0';
fs.mkdirSync(screenshotDir, { recursive: true });
const origin = process.env.V3_BASE_URL || 'http://127.0.0.1:8080';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: 'light' });
const page = await context.newPage();
page.setDefaultTimeout(10000);
page.setDefaultNavigationTimeout(30000);
const runStartedAt = Date.now();
const traceState = { gate: 'startup', action: 'browser launched', at: new Date().toISOString() };
function markAction(gate, action) {
  traceState.gate = gate;
  traceState.action = action;
  traceState.at = new Date().toISOString();
}
const result = {
  task: 'V3-V Administration, Settings, modal, Console and Webcam visual checks',
  revision,
  browser: { name: 'Playwright bundled Chromium', version: browser.version(), headless: true, deviceScaleFactor: 1 },
  runnerPid: process.pid,
  sourceContext: {
    revision,
    dirtyFiles: [],
    resourceTableSourceSha256: tableSourceSha256,
    devHmrContextCompiled: true,
    devHmrResourceTableCompiled: true,
    navigationComparison: 'admin-navigation-compare-v3-after-table-fix.json: fresh contexts, direct page.goto and native Administration→Commands click both resolved with zero update-depth errors',
    screenshotPhase: 'fresh browser after ToastManager slotProps and stable EMPTY_ROWS HMR compiles'
  },
  assertions: [],
  screenshots: [],
  visualSettlements: [],
  apiWrites: [],
  events: { console: [], consoleSummary: {}, cdpConsoleDetails: [], cdpConsoleSummary: {}, pageErrors: [], requestFailures: [], httpErrors: [] }
};
const redact = value => String(value)
  .replace(/([?&]token=)[^&\s"']+/gi, '$1[redacted]')
  .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [redacted]')
  .replace(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g, '[redacted-jwt]');
function flush() {
  fs.writeFileSync(runProgressPath, `${JSON.stringify(result, null, 2)}\n`);
  const progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));
  progress.phase = 'post-table-fix fresh routes runner active';
  progress.supplemental = path.basename(runProgressPath);
  progress.runnerLifecycle ||= {};
  progress.runnerLifecycle.currentRunner = { pid: process.pid, status: 'running', result: path.basename(resultPath), progress: path.basename(runProgressPath), sourceHash: tableSourceSha256 };
  progress.evidenceCounts = {
    assertionsPassed: result.assertions.filter(item => item.status === 'passed').length,
    assertionsFailed: result.assertions.filter(item => item.status === 'failed').length,
    screenshots: result.screenshots.length
  };
  progress.screenshots = [...new Set([...(progress.screenshots || []), ...result.screenshots])];
  progress.browser = result.browser;
  fs.writeFileSync(progressPath, `${JSON.stringify(progress, null, 2)}\n`);
}
const cdp = await context.newCDPSession(page);
await cdp.send('Runtime.enable');
function recordConsole(type, text, location = null, stackTrace = [], source = 'Playwright') {
  const safeText = redact(text);
  const signature = `${source}\n${type}\n${safeText}`;
  const summary = result.events.consoleSummary[signature] ||= { type, text: safeText, count: 0, first: null, last: null, locations: [] };
  const record = { type, text: safeText, location, stackTrace, source, elapsedMs: Date.now() - runStartedAt, trace: { ...traceState } };
  summary.count += 1;
  summary.first ||= record;
  summary.last = record;
  if (location && summary.locations.length < 12 && !summary.locations.some(item => JSON.stringify(item) === JSON.stringify(location))) summary.locations.push(location);
  if (summary.count <= 20 && result.events.console.length < 300) result.events.console.push(record);
  return record;
}
page.on('console', message => recordConsole(message.type(), message.text(), message.location(), [], 'Playwright console event'));
cdp.on('Runtime.consoleAPICalled', event => {
  const values = event.args.map(arg => arg.value !== undefined ? arg.value : arg.description !== undefined ? arg.description : arg.unserializableValue !== undefined ? arg.unserializableValue : '[unavailable]');
  const text = values.map(value => typeof value === 'string' ? value : JSON.stringify(value)).join(' ');
  const type = event.type === 'warning' ? 'warning' : event.type;
  const location = event.stackTrace?.callFrames?.[0] ? { url: event.stackTrace.callFrames[0].url, lineNumber: event.stackTrace.callFrames[0].lineNumber, columnNumber: event.stackTrace.callFrames[0].columnNumber } : null;
  const frames = (event.stackTrace?.callFrames || []).map(frame => ({ functionName: frame.functionName, url: frame.url, lineNumber: frame.lineNumber, columnNumber: frame.columnNumber }));
  const entry = recordConsole(type, text, location, frames, 'CDP Runtime.consoleAPICalled');
  const signature = `${entry.source}\n${type}\n${entry.text}`;
  const summary = result.events.cdpConsoleSummary[signature] ||= { type, text: entry.text, count: 0, first: null, last: null };
  summary.count += 1;
  summary.first ||= entry;
  summary.last = entry;
  if (summary.count <= 25 && result.events.cdpConsoleDetails.length < 250) result.events.cdpConsoleDetails.push(entry);
});
page.on('pageerror', error => result.events.pageErrors.push({ message: redact(error.message), stack: redact(error.stack || ''), elapsedMs: Date.now() - runStartedAt, trace: { ...traceState } }));
page.on('requestfailed', request => result.events.requestFailures.push({ method: request.method(), resourceType: request.resourceType(), url: redact(request.url()).split('?')[0], error: redact(request.failure()?.errorText || '') }));
page.on('request', request => {
  const method = request.method();
  let url;
  try { url = new URL(request.url()); } catch (_) { return; }
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && url.pathname.startsWith('/api/')) result.apiWrites.push({ method, path: url.pathname });
});
page.on('response', response => {
  if (response.status() >= 400) result.events.httpErrors.push({ status: response.status(), url: redact(response.url()).split('?')[0] });
});

async function screenshot(name, fullPage = false) {
  markAction(traceState.gate, `capture screenshot ${name}; wait for stable dialog/menu bounds, screenshot animations disabled`);
  const evaluateBounded = async () => {
    let timeoutId;
    const timeout = new Promise(resolve => {
      timeoutId = setTimeout(() => resolve({ timedOut: true, error: 'DOM measurement exceeded 900ms' }), 900);
    });
    const measurement = page.evaluate(() => {
      const runningAnimations = document.getAnimations().filter(animation => animation.playState === 'running').map(animation => ({ effect: animation.effect?.constructor?.name || 'unknown', currentTime: animation.currentTime, endTime: animation.effect?.getComputedTiming()?.endTime }));
      const surfaces = [...document.querySelectorAll('[role="dialog"], [role="menu"]')].map((node, index) => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return { index, role: node.getAttribute('role'), label: node.getAttribute('aria-label'), x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height), opacity: style.opacity, visibility: style.visibility };
      });
      return { finishedAnimations: 0, animationFinishInvoked: false, runningAnimations, surfaces };
    });
    const result = await Promise.race([measurement, timeout]);
    clearTimeout(timeoutId);
    return result;
  };
  const first = await evaluateBounded();
  let settlement = first.timedOut ? { finishedAnimations: 0, animationFinishInvoked: false, stableFrames: 0, stableSamples: 0, timedOut: true, fallback: 'Playwright screenshot animations:disabled', surfaces: [] } : { ...first, stableFrames: 0, stableSamples: 0, timedOut: false };
  if (!settlement.timedOut) {
    let previous = JSON.stringify(first.surfaces);
    for (let attempt = 0; attempt < 16 && settlement.stableSamples < 2; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 60));
      const next = await evaluateBounded();
      if (next.timedOut) {
        settlement.timedOut = true;
        settlement.fallback = 'Playwright screenshot animations:disabled';
        break;
      }
      const signature = JSON.stringify(next.surfaces);
      settlement.stableSamples = signature === previous ? settlement.stableSamples + 1 : 0;
      settlement.stableFrames = settlement.stableSamples;
      settlement.finishedAnimations += next.finishedAnimations;
      settlement.surfaces = next.surfaces;
      previous = signature;
    }
  }
  if (!settlement.timedOut && settlement.surfaces.length && settlement.stableSamples < 2) throw new Error(`Overlay geometry did not stabilize before screenshot ${name}: ${JSON.stringify(settlement)}`);
  if (settlement.surfaces.some(surface => surface.visibility === 'visible' && Number(surface.opacity) > 0 && (surface.width <= 0 || surface.height <= 0))) throw new Error(`Visible overlay has no screenshot area before ${name}: ${JSON.stringify(settlement)}`);
  await page.waitForTimeout(80);
  const relative = path.join('screenshots', name);
  markAction(traceState.gate, `Playwright screenshot ${name} with animations:disabled`);
  await page.screenshot({ path: path.join(artifactDir, relative), fullPage, animations: 'disabled', caret: 'hide', timeout: 5000 });
  result.screenshots.push(relative);
  result.visualSettlements.push({ screenshot: relative, ...settlement });
  flush();
  return relative;
}
async function gate(name, fn) {
  markAction(name, 'enter gate');
  const startedAt = Date.now();
  try {
    const detail = await fn();
    result.assertions.push({ name, status: 'passed', durationMs: Date.now() - startedAt, detail: detail ?? null });
  } catch (error) {
    result.assertions.push({ name, status: 'failed', durationMs: Date.now() - startedAt, error: redact(error).slice(0, 1200) });
    const failurePath = `failure-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
    await screenshot(failurePath).catch(() => {});
  }
  flush();
}
async function go(route) {
  markAction(traceState.gate, `navigate to ${route}`);
  await page.goto(`${origin}/#${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.locator('main').waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(120);
}
async function closeDialogWithEscape(dialog) {
  if (await dialog.isVisible().catch(() => false)) {
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden', timeout: 5000 });
  }
}
async function ensureWorkspacePanelOpen(side) {
  const show = page.getByRole('button', { name: `Show ${side} panel`, exact: true });
  if (await show.isVisible().catch(() => false)) {
    markAction(traceState.gate, `open collapsed ${side} workspace panel`);
    await show.click();
    await page.getByRole('button', { name: `Hide ${side} panel`, exact: true }).waitFor({ state: 'visible', timeout: 5000 });
  }
}
async function setAppearance(choice) {
  const toggle = page.locator('header[aria-label="Application header"] button[aria-haspopup="menu"]').last();
  await toggle.click();
  await page.getByRole('menuitem', { name: /Appearance:/ }).click();
  const label = { light: 'Light theme', dark: 'Dark theme', auto: 'Use device theme' }[choice];
  await page.getByText(label, { exact: true }).last().click();
  await page.waitForTimeout(180);
}
async function readRegionDetails(region) {
  return region.evaluate(node => {
    const rect = node.getBoundingClientRect();
    return {
      ariaLabel: node.getAttribute('aria-label'),
      text: node.innerText.replace(/\s+/g, ' ').slice(0, 260),
      rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height), right: Math.round(rect.right), bottom: Math.round(rect.bottom) },
      inViewport: rect.right > 0 && rect.bottom > 0 && rect.left < innerWidth && rect.top < innerHeight,
      fullyInViewport: rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight
    };
  });
}
async function connectSimulator() {
  const connection = page.getByRole('region', { name: 'Connection widget', exact: true });
  const close = connection.getByRole('button', { name: 'Close', exact: true });
  if (await close.isVisible().catch(() => false)) return { alreadyConnected: true, configuredPort: '/tmp/ttyGRBL' };
  const automatic = connection.getByRole('checkbox', { name: 'Connect automatically', exact: true });
  if (await automatic.isChecked().catch(() => false)) await connection.getByText('Connect automatically', { exact: true }).click();
  const grbl = connection.getByRole('button', { name: 'Grbl', exact: true });
  if (await grbl.getAttribute('data-selected') === null) await grbl.click();
  await connection.getByRole('button', { name: 'Serial port', exact: true }).click();
  const port = page.getByRole('menuitem', { name: /\/tmp\/ttyGRBL/ });
  await port.waitFor({ state: 'visible', timeout: 20000 });
  const selectedPort = (await port.innerText()).trim();
  await port.click();
  const open = connection.getByRole('button', { name: 'Open', exact: true });
  await open.waitFor({ state: 'visible' });
  if (!(await open.isEnabled())) throw new Error('Configured synthetic simulator port is not selectable');
  await open.click();
  await close.waitFor({ state: 'visible', timeout: 20000 });
  return { alreadyConnected: false, selectedPort, connectedToSyntheticSimulator: true, noRunOrJogAction: true };
}

try {
  await go('/workspace');
  await page.getByRole('region', { name: 'Connection widget', exact: true }).waitFor({ state: 'visible' });

  await gate('responsive sidebar and header at 768x900', async () => {
    await page.setViewportSize({ width: 768, height: 900 });
    const toggle = page.getByRole('button', { name: 'Toggle navigation', exact: true });
    const present = await toggle.count() > 0 && await toggle.isVisible().catch(() => false);
    if (present) await toggle.click();
    await page.waitForTimeout(150);
    const header = await page.locator('header[aria-label="Application header"]').evaluate(node => {
      const r = node.getBoundingClientRect();
      return { rect: { x: r.x, y: r.y, width: r.width, height: r.height }, overflowX: node.scrollWidth > node.clientWidth, text: node.innerText.replace(/\s+/g, ' ').slice(0, 160) };
    });
    const navText = await page.locator('nav').allInnerTexts().catch(() => []);
    await screenshot('sidebar-header-768x900.png');
    if (!present) throw new Error('Responsive navigation toggle was not visible at 768px');
    if (header.overflowX) throw new Error(`Header overflows at 768px: ${JSON.stringify(header)}`);
    return { viewport: '768x900', navigationToggle: present, navigationText: navText.map(text => text.replace(/\s+/g, ' ').slice(0, 120)), header };
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await gate('Widget Manager dialog keyboard focus, Tab containment, Escape and return focus', async () => {
    await go('/workspace');
    const trigger = page.getByRole('button', { name: /Manage Widgets \(/ }).first();
    await trigger.focus();
    markAction(traceState.gate, 'click Manage Widgets to open the Widget Manager dialog');
    await trigger.click();
    const dialog = page.getByRole('dialog').last();
    await dialog.waitFor({ state: 'visible' });
    const focusInside = await dialog.evaluate(node => node.contains(document.activeElement));
    await screenshot('dialog-widget-manager-open.png');
    await page.keyboard.press('Tab');
    const tabStayedInside = await dialog.evaluate(node => node.contains(document.activeElement));
    await closeDialogWithEscape(dialog);
    const focusReturned = await trigger.evaluate(node => node === document.activeElement);
    if (!focusInside || !tabStayedInside || !focusReturned) throw new Error(JSON.stringify({ focusInside, tabStayedInside, focusReturned }));
    return { focusInside, tabStayedInside, focusReturned };
  });

  await gate('Widget Manager dialog visible and usable at 768x900', async () => {
    await page.setViewportSize({ width: 768, height: 900 });
    await go('/workspace');
    const trigger = page.getByRole('button', { name: /Manage Widgets \(/ }).first();
    await trigger.focus();
    markAction(traceState.gate, 'click Manage Widgets at 768x900');
    await trigger.click();
    const dialog = page.getByRole('dialog').last();
    await dialog.waitFor({ state: 'visible' });
    const focusInside = await dialog.evaluate(node => node.contains(document.activeElement));
    const readContent = () => dialog.evaluate(node => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      const controls = [...node.querySelectorAll('button')].map(button => {
        const r = button.getBoundingClientRect();
        const buttonStyle = getComputedStyle(button);
        return { text: button.innerText.trim(), ariaLabel: button.getAttribute('aria-label'), visible: buttonStyle.display !== 'none' && buttonStyle.visibility !== 'hidden' && Number(buttonStyle.opacity) > 0 && r.width > 0 && r.height > 0, inViewport: r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight };
      });
      return { text: node.innerText.replace(/\s+/g, ' ').slice(0, 500), rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, opacity: style.opacity, visibility: style.visibility, controls };
    });
    await screenshot('dialog-widget-manager-open-768x900.png');
    const settlement = result.visualSettlements.at(-1);
    const content = await readContent();
    await closeDialogWithEscape(dialog);
    const focusReturned = await trigger.evaluate(node => node === document.activeElement);
    if (!focusInside || !focusReturned || content.opacity !== '1' || content.visibility !== 'visible' || content.rect.width <= 0 || content.rect.height <= 0) throw new Error(JSON.stringify({ focusInside, focusReturned, content }));
    if (!settlement?.surfaces.some(surface => surface.role === 'dialog') || settlement.stableSamples < 2 || settlement.timedOut) throw new Error(`768px dialog screenshot lacked a settled dialog surface: ${JSON.stringify(settlement)}`);
    if (!content.controls.some(control => control.visible && control.inViewport)) throw new Error(`768px dialog has no visible in-viewport controls: ${JSON.stringify(content.controls)}`);
    return { viewport: '768x900', focusInside, focusReturned, dialog: content, visualSettlement: settlement, screenshot: 'dialog-widget-manager-open-768x900.png' };
  });

  await gate('Collapsed side panels leave a usable visible 3D canvas at 768x900', async () => {
    await page.setViewportSize({ width: 768, height: 900 });
    await go('/workspace');
    const panelStateBefore = {};
    for (const side of ['left', 'right']) panelStateBefore[side] = await page.getByRole('button', { name: `Hide ${side} panel`, exact: true }).isVisible().catch(() => false);
    const before = await page.locator('[role="region"][aria-label="3D Visualizer widget"] canvas').first().evaluate(node => {
      const r = node.getBoundingClientRect();
      return { rect: { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }, drawingBuffer: { width: node.width, height: node.height } };
    });
    for (const label of ['Hide left panel', 'Hide right panel']) {
      const control = page.getByRole('button', { name: label, exact: true });
      await control.waitFor({ state: 'visible' });
      markAction(traceState.gate, `click ${label}`);
      await control.click();
    }
    await page.waitForFunction(() => {
      const canvas = document.querySelector('[role="region"][aria-label="3D Visualizer widget"] canvas');
      const host = document.querySelector('[aria-label="3D Visualizer"]');
      if (!canvas || !host) return false;
      const c = canvas.getBoundingClientRect();
      const h = host.getBoundingClientRect();
      return canvas.width > 0 && canvas.height > 0 && c.width > 0 && c.height > 0 && c.width <= h.width + 2 && c.height <= h.height + 2;
    }, { timeout: 10000 });
    await page.waitForTimeout(120);
    const detail = await page.evaluate(() => {
      const canvas = document.querySelector('[role="region"][aria-label="3D Visualizer widget"] canvas');
      const host = document.querySelector('[aria-label="3D Visualizer"]');
      const cr = canvas.getBoundingClientRect();
      const hr = host.getBoundingClientRect();
      const panelControls = [...document.querySelectorAll('button[aria-label]')]
        .filter(button => /left panel|right panel/i.test(button.getAttribute('aria-label') || ''))
        .map(button => {
          const r = button.getBoundingClientRect();
          return { ariaLabel: button.getAttribute('aria-label'), expanded: button.getAttribute('aria-expanded'), pressed: button.getAttribute('aria-pressed'), rect: { x: r.x, y: r.y, width: r.width, height: r.height } };
        });
      return {
        canvas: { rect: { x: cr.x, y: cr.y, width: cr.width, height: cr.height, right: cr.right, bottom: cr.bottom }, drawingBuffer: { width: canvas.width, height: canvas.height } },
        host: { rect: { x: hr.x, y: hr.y, width: hr.width, height: hr.height, right: hr.right, bottom: hr.bottom }, clientSize: { width: host.clientWidth, height: host.clientHeight } },
        fitsHost: cr.width > 0 && cr.height > 0 && cr.left >= hr.left - 2 && cr.top >= hr.top - 2 && cr.right <= hr.right + 2 && cr.bottom <= hr.bottom + 2,
        documentOverflowX: document.documentElement.scrollWidth > innerWidth,
        panelControls
      };
    });
    await screenshot('workspace-panels-collapsed-canvas-768x900.png');
    for (const side of ['left', 'right']) if (panelStateBefore[side]) await ensureWorkspacePanelOpen(side);
    const panelStateAfter = {};
    for (const side of ['left', 'right']) panelStateAfter[side] = await page.getByRole('button', { name: `Hide ${side} panel`, exact: true }).isVisible().catch(() => false);
    const expandedBy = detail.host.rect.width - before.rect.width;
    if (detail.canvas.drawingBuffer.width <= 0 || detail.canvas.drawingBuffer.height <= 0 || detail.canvas.rect.width <= 0 || detail.canvas.rect.height <= 0 || !detail.fitsHost || detail.documentOverflowX || expandedBy < 100 || detail.host.rect.width < 500 || JSON.stringify(panelStateAfter) !== JSON.stringify(panelStateBefore)) throw new Error(JSON.stringify({ before, after: detail, expandedBy, panelStateBefore, panelStateAfter }));
    return { viewport: '768x900', collapseActions: ['Hide left panel', 'Hide right panel'], before, after: detail, canvasExpandedBy: expandedBy, panelStateBefore, panelStateAfter, screenshot: 'workspace-panels-collapsed-canvas-768x900.png' };
  });

  const resources = [
    { key: 'commands', route: '/administration/commands', title: 'New Command' },
    { key: 'events', route: '/administration/events', title: 'New Event' },
    { key: 'machines', route: '/administration/machine-profiles', title: 'New Machine' },
    { key: 'macros', route: '/administration/macros', title: 'New Macro' },
    { key: 'users', route: '/administration/user-accounts', title: 'New User' }
  ];
  for (const resource of resources) {
    await gate(`Administration ${resource.key} list and blank-create validation drawer`, async () => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await go(resource.route);
      const add = page.getByRole('button', { name: 'Add', exact: true }).first();
      await add.waitFor({ state: 'visible' });
      const pageText = (await page.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 420);
      const tables = await page.getByRole('table').count();
      await screenshot(`administration-${resource.key}-list-1440x900.png`);
      const writesBefore = result.apiWrites.length;
      markAction(traceState.gate, `click Add on ${resource.key} list`);
      await add.click();
      await page.getByText(resource.title, { exact: true }).waitFor({ state: 'visible' });
      const dialog = page.getByRole('dialog').last();
      await dialog.waitFor({ state: 'visible' });
      const beforeSubmit = await dialog.innerText();
      await screenshot(`administration-${resource.key}-drawer-1440x900.png`);
      const submit = dialog.getByRole('button', { name: 'Add', exact: true }).last();
      const submitEnabled = await submit.isEnabled().catch(() => false);
      if (submitEnabled) {
        markAction(traceState.gate, `submit blank ${resource.key} drawer to show validation`);
        await submit.click();
      }
      await page.waitForTimeout(180);
      const validation = await dialog.evaluate(node => {
        const invalid = [...node.querySelectorAll('[aria-invalid="true"], input:invalid, textarea:invalid')].map(field => ({ tag: field.tagName, name: field.getAttribute('name'), label: field.getAttribute('aria-label'), value: field.value || '' }));
        const errors = [...node.querySelectorAll('[role="alert"], [aria-live="polite"]')].map(item => item.innerText.trim()).filter(Boolean);
        return { invalidFields: invalid, messages: errors, text: node.innerText.replace(/\s+/g, ' ').slice(0, 560) };
      });
      await screenshot(`administration-${resource.key}-validation-1440x900.png`);
      const writeDelta = result.apiWrites.length - writesBefore;
      const observedValidation = validation.invalidFields.length > 0 || validation.messages.length > 0 || /required|is required|must be provided/i.test(validation.text.slice(beforeSubmit.length));
      await closeDialogWithEscape(dialog);
      if (!submitEnabled) throw new Error('Blank create submit button is disabled; validation state could not be triggered');
      if (!observedValidation) throw new Error(`Blank submit did not expose validation: ${JSON.stringify(validation)}`);
      if (writeDelta !== 0) throw new Error(`Blank validation unexpectedly sent ${writeDelta} API writes`);
      return { route: resource.route, listText: pageText, tableCount: tables, drawerTitle: resource.title, submitEnabled, validation, writeDelta, screenshots: [`administration-${resource.key}-list-1440x900.png`, `administration-${resource.key}-drawer-1440x900.png`, `administration-${resource.key}-validation-1440x900.png`] };
    });
  }

  await gate('General Settings and Workspace Settings routes resolve semantic styles', async () => {
    const pages = [];
    for (const [key, route] of [['general', '/administration/general-settings'], ['workspace', '/administration/workspace-settings']]) {
      await go(route);
      const details = await page.evaluate(() => {
        const main = document.querySelector('main');
        const style = getComputedStyle(main);
        const rect = main.getBoundingClientRect();
        const tokens = Object.fromEntries(['--tonic-colors-text-primary', '--tonic-colors-background-highest', '--tonic-colors-border-secondary'].map(name => [name, getComputedStyle(main).getPropertyValue(name).trim()]));
        return { text: main.innerText.replace(/\s+/g, ' ').slice(0, 600), rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom }, overflowX: document.documentElement.scrollWidth > innerWidth, colors: { foreground: style.color, background: style.backgroundColor }, tokens };
      });
      await screenshot(`settings-${key}-1440x900.png`);
      pages.push({ key, route, ...details });
      if (details.overflowX || !details.tokens['--tonic-colors-text-primary'] || !details.tokens['--tonic-colors-background-highest']) throw new Error(`${key} settings route has overflow or unresolved semantic tokens: ${JSON.stringify(details)}`);
    }
    return { pages };
  });

  await gate('Macro editor variable menu keyboard insertion', async () => {
    await go('/administration/macros');
    markAction(traceState.gate, 'click Add to open Macro editor');
    await page.getByRole('button', { name: 'Add', exact: true }).first().click();
    const dialog = page.getByRole('dialog').last();
    await page.getByText('New Macro', { exact: true }).waitFor({ state: 'visible' });
    const name = page.getByLabel(/^Macro name:/);
    const commands = page.getByLabel(/^G-code commands:/);
    await name.fill('V3 visual fixture macro');
    await commands.fill('G90\n');
    await commands.focus();
    await commands.press('End');
    const variableToggle = page.getByRole('button', { name: 'Select variables', exact: true });
    markAction(traceState.gate, 'open Macro editor Select variables menu');
    await variableToggle.click();
    const waitVariable = page.getByRole('menuitem', { name: '%wait', exact: true });
    await waitVariable.waitFor({ state: 'visible' });
    await screenshot('macro-editor-variable-menu-open.png');
    await waitVariable.focus();
    await waitVariable.press('Enter');
    const value = await commands.inputValue();
    const dom = await variableToggle.evaluate(node => ({ tag: node.tagName, nestedButtons: node.querySelectorAll('button').length }));
    await screenshot('macro-editor-variable-inserted.png');
    await closeDialogWithEscape(dialog);
    if (value !== 'G90\n%wait') throw new Error(`Keyboard insertion value differs: ${JSON.stringify(value)}`);
    if (dom.tag !== 'BUTTON' || dom.nestedButtons !== 0) throw new Error(`Variable toggle DOM is invalid: ${JSON.stringify(dom)}`);
    return { insertedValue: value, menuKeyboard: 'Enter', toggleDom: dom, noSaveClicked: true };
  });

  await gate('Dark Administration Macro drawer, validation error and variable menu settle visibly', async () => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await go('/administration/macros');
    await setAppearance('dark');
    const add = page.getByRole('button', { name: 'Add', exact: true }).first();
    const writesBefore = result.apiWrites.length;
    markAction(traceState.gate, 'click Add to open dark Administration Macro drawer');
    await add.click();
    const dialog = page.getByRole('dialog').last();
    await page.getByText('New Macro', { exact: true }).waitFor({ state: 'visible' });
    await dialog.waitFor({ state: 'visible' });
    const readDrawer = () => dialog.evaluate(node => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      const buttons = [...node.querySelectorAll('button')].map(button => {
        const r = button.getBoundingClientRect();
        const s = getComputedStyle(button);
        return { text: button.innerText.trim(), ariaLabel: button.getAttribute('aria-label'), visible: s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) > 0 && r.width > 0 && r.height > 0, inViewport: r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight };
      });
      return { text: node.innerText.replace(/\s+/g, ' ').slice(0, 520), rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom }, opacity: style.opacity, visibility: style.visibility, buttons, colors: { foreground: style.color, background: style.backgroundColor } };
    });
    await screenshot('administration-macros-drawer-dark-1440x900.png');
    const drawerSettlement = result.visualSettlements.at(-1);
    const drawer = await readDrawer();
    markAction(traceState.gate, 'submit blank dark Macro drawer to show validation');
    await dialog.getByRole('button', { name: 'Add', exact: true }).last().click();
    await page.waitForTimeout(150);
    const validation = await dialog.evaluate(node => ({
      text: node.innerText.replace(/\s+/g, ' ').slice(0, 620),
      invalid: [...node.querySelectorAll('[aria-invalid="true"], input:invalid, textarea:invalid')].map(field => ({ tag: field.tagName, name: field.getAttribute('name'), value: field.value || '' })),
      messages: [...node.querySelectorAll('[role="alert"], [aria-live="polite"]')].map(item => item.innerText.trim()).filter(Boolean)
    }));
    await screenshot('administration-macros-validation-dark-1440x900.png');
    const validationSettlement = result.visualSettlements.at(-1);
    await page.getByLabel(/^Macro name:/).fill('V3 dark fixture macro');
    const commands = page.getByLabel(/^G-code commands:/);
    await commands.fill('G90');
    markAction(traceState.gate, 'open dark Macro editor Select variables menu');
    await page.getByRole('button', { name: 'Select variables', exact: true }).click();
    await page.getByRole('menuitem', { name: '%wait', exact: true }).waitFor({ state: 'visible' });
    await screenshot('administration-macros-variable-menu-dark-1440x900.png');
    const menuSettlement = result.visualSettlements.at(-1);
    const menuDetails = await page.getByRole('menu').last().evaluate(node => {
      const r = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return { text: node.innerText.replace(/\s+/g, ' ').slice(0, 300), rect: { x: r.x, y: r.y, width: r.width, height: r.height }, opacity: style.opacity, visibility: style.visibility };
    });
    await page.keyboard.press('Escape');
    await closeDialogWithEscape(dialog);
    const writeDelta = result.apiWrites.length - writesBefore;
    for (const [label, settlement] of [['drawer', drawerSettlement], ['validation', validationSettlement], ['menu', menuSettlement]]) {
      if (!settlement || settlement.stableFrames < 2) throw new Error(`${label} screenshot was not geometrically stable: ${JSON.stringify(settlement)}`);
    }
    if (drawer.opacity !== '1' || drawer.visibility !== 'visible' || drawer.rect.width < 300 || !drawer.text.includes('New Macro')) throw new Error(`Dark macro drawer is not settled/visible: ${JSON.stringify(drawer)}`);
    if (!drawer.buttons.some(button => button.text === 'Cancel' && button.visible && button.inViewport) || !drawer.buttons.some(button => button.text === 'Add' && button.visible && button.inViewport)) throw new Error(`Macro drawer footer actions are not visibly in frame: ${JSON.stringify(drawer.buttons)}`);
    if (drawerSettlement.timedOut || drawerSettlement.stableSamples < 2 || !drawerSettlement.surfaces.some(surface => surface.role === 'dialog')) throw new Error(`Dark macro drawer screenshot contains no settled dialog: ${JSON.stringify(drawerSettlement)}`);
    if (validation.invalid.length < 2 || !/required/i.test(validation.text)) throw new Error(`Dark macro blank-submit error state was not visible: ${JSON.stringify(validation)}`);
    if (!menuDetails.text.includes('%wait') || menuDetails.opacity !== '1' || menuDetails.visibility !== 'visible' || menuSettlement.timedOut || menuSettlement.stableSamples < 2 || !menuSettlement.surfaces.some(surface => surface.role === 'menu')) throw new Error(`Dark macro variable menu was not visible/settled: ${JSON.stringify({ menuDetails, menuSettlement })}`);
    if (writeDelta !== 0) throw new Error(`Dark macro editor sent ${writeDelta} API writes`);
    await setAppearance('light');
    return { theme: 'dark', drawer, validation, menu: menuDetails, settlements: [drawerSettlement, validationSettlement, menuSettlement], writeDelta, screenshots: ['administration-macros-drawer-dark-1440x900.png', 'administration-macros-validation-dark-1440x900.png', 'administration-macros-variable-menu-dark-1440x900.png'], noSaveClicked: true };
  });

  await gate('Console terminal uses fixed black background', async () => {
    await go('/workspace');
    await ensureWorkspacePanelOpen('left');
    markAction(traceState.gate, 'select and connect the synthetic Grbl simulator; no motion/run/jog');
    const simulator = await connectSimulator();
    const consoleRegion = page.getByRole('region', { name: 'Console widget', exact: true });
    await consoleRegion.scrollIntoViewIfNeeded();
    await consoleRegion.getByRole('button', { name: 'Enter full screen', exact: true }).click();
    await consoleRegion.getByRole('button', { name: 'Exit full screen', exact: true }).waitFor({ state: 'visible' });
    await page.waitForTimeout(150);
    const details = await consoleRegion.evaluate(node => {
      const candidates = [...node.querySelectorAll('*')].map(element => {
        const style = getComputedStyle(element);
        const r = element.getBoundingClientRect();
        return { tag: element.tagName, className: typeof element.className === 'string' ? element.className.slice(0, 100) : '', background: style.backgroundColor, color: style.color, rect: { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) } };
      }).filter(item => item.rect.width > 100 && item.rect.height > 20);
      const black = candidates.filter(item => {
        const values = item.background.match(/rgba?\(([^)]+)\)/)?.[1].split(',').map(value => Number(value.trim())) || [];
        return values.length >= 3 && values[0] <= 16 && values[1] <= 16 && values[2] <= 16 && (values[3] ?? 1) > 0;
      });
      return { text: node.innerText.replace(/\s+/g, ' ').slice(0, 260), candidates, blackSurfaces: black };
    });
    await screenshot('console-fixed-black-target-1440x900.png');
    if (!details.blackSurfaces.length) throw new Error(`No visible black terminal surface found: ${JSON.stringify(details.candidates)}`);
    await consoleRegion.getByRole('button', { name: 'Exit full screen', exact: true }).click();
    return { ...details, simulator, targetScreenshot: 'console-fixed-black-target-1440x900.png' };
  });

  await gate('Webcam empty state and video-device settings labels', async () => {
    await go('/workspace');
    await ensureWorkspacePanelOpen('left');
    const webcam = page.getByRole('region', { name: 'Webcam widget', exact: true });
    await webcam.scrollIntoViewIfNeeded();
    await page.waitForTimeout(120);
    const empty = await readRegionDetails(webcam);
    const webcamOff = await webcam.getByText('Webcam is off', { exact: true }).count();
    const videoCount = await webcam.locator('video').count();
    const videoStatus = await webcam.locator('video').evaluateAll(nodes => nodes.map(node => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return {
        hasStream: Boolean(node.srcObject),
        src: node.getAttribute('src'),
        currentSrc: node.currentSrc,
        readyState: node.readyState,
        videoWidth: node.videoWidth,
        videoHeight: node.videoHeight,
        liveTracks: node.srcObject ? node.srcObject.getTracks().filter(track => track.readyState === 'live').length : 0,
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        paused: node.paused,
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
      };
    }));
    await screenshot('webcam-empty-target-1440x900.png');
    markAction(traceState.gate, 'open Webcam widget More options');
    await webcam.getByRole('button', { name: 'More options', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Settings', exact: true }).click();
    const dialog = page.getByRole('dialog').last();
    await page.getByText('Webcam Settings', { exact: true }).waitFor({ state: 'visible' });
    const deviceSelector = page.getByRole('combobox', { name: 'Choose a video device', exact: true });
    const labels = await dialog.innerText();
    await screenshot('webcam-settings-video-labels.png');
    const selectorCount = await deviceSelector.count();
    await closeDialogWithEscape(dialog);
    if (!webcamOff) throw new Error('Empty webcam state does not show Webcam is off');
    if (videoCount > 1 || videoStatus.some(video => video.hasStream || video.liveTracks > 0 || Boolean(video.currentSrc) || video.readyState >= 2 || video.videoWidth > 0 || video.videoHeight > 0 || !video.paused)) throw new Error(`Empty webcam state unexpectedly has active camera media: ${JSON.stringify(videoStatus)}`);
    if (selectorCount !== 1) throw new Error(`Expected one accessible video device selector, found ${selectorCount}`);
    if (!/Video|Media source|device/i.test(labels)) throw new Error(`Webcam settings video labels were not visible: ${labels.slice(0, 500)}`);
    return { emptyState: empty, webcamOffText: true, mountedVideoElementCount: videoCount, videoStatus, videoDeviceSelectorCount: selectorCount, settingsLabels: labels.replace(/\s+/g, ' ').slice(0, 500), noActiveMediaSourceOrReadyFrames: true };
  });

  await gate('ToastManager TransitionProps deprecation absent after root context fix', async () => {
    const matching = Object.values(result.events.cdpConsoleSummary).filter(item => /ToastManager:.*TransitionProps.*deprecated/i.test(item.text));
    if (matching.length) throw new Error(`ToastManager deprecated TransitionProps runtime message remains: ${JSON.stringify(matching)}`);
    return { deprecatedMessageCount: 0, sourceContext: result.sourceContext, observedHmrCompile: 'webpack compiled successfully; context.jsx included in output' };
  });

  result.warningClassification = Object.values(result.events.cdpConsoleSummary).map(item => ({ ...item, classification: /WebGL|WebGL2/i.test(item.text) ? 'webgl' : /deprecated|deprecation|util\._extend|url\.parse|fs\.Stats/i.test(item.text) ? 'known-runtime-deprecation' : /^Warning:|Each child in a list|potentially unsafe when doing server-side rendering/i.test(item.text) ? 'application-warning' : item.type === 'error' ? 'application-error' : item.type === 'warning' || /warning|warn/i.test(item.type) ? 'application-warning' : 'console-info' }));
  result.unclassifiedConsoleErrors = result.warningClassification.filter(item => item.type === 'error' && item.classification === 'application-error');
  result.errorClassificationSummary = result.warningClassification.filter(item => item.type === 'error').map(item => ({ text: item.text, count: item.count, classification: item.classification, stack: item.first?.stackTrace, trace: item.first?.trace }));
  result.apiWriteClassification = {
    anonymousSessionInitialization: result.apiWrites.filter(write => write.path === '/api/signin'),
    userMutationRequests: result.apiWrites.filter(write => write.path !== '/api/signin')
  };
  result.status = result.assertions.every(item => item.status === 'passed') ? 'passed' : 'failed';
  result.completedAt = new Date().toISOString();
  fs.writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`);
  const progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));
  progress.phase = 'post-table-fix fresh routes run finished; inspect result and focused Marlin follow-up';
  progress.supplemental = path.basename(resultPath);
  progress.runnerLifecycle ||= {};
  progress.runnerLifecycle.currentRunner = { pid: process.pid, status: result.status, result: path.basename(resultPath), progress: path.basename(runProgressPath), sourceHash: tableSourceSha256 };
  progress.evidenceCounts = {
    assertionsPassed: result.assertions.filter(item => item.status === 'passed').length,
    assertionsFailed: result.assertions.filter(item => item.status === 'failed').length,
    screenshots: [...new Set([...(progress.screenshots || []), ...result.screenshots])].length
  };
  progress.screenshots = [...new Set([...(progress.screenshots || []), ...result.screenshots])];
  progress.warningClassification = result.warningClassification.reduce((counts, item) => ({ ...counts, [item.classification]: (counts[item.classification] || 0) + item.count }), {});
  fs.writeFileSync(progressPath, `${JSON.stringify(progress, null, 2)}\n`);
} catch (error) {
  result.status = 'failed';
  result.fatalError = redact(error).slice(0, 1500);
} finally {
  result.completedAt ||= new Date().toISOString();
  fs.writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`);
  const progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));
  progress.phase = 'post-table-fix fresh routes run finished; inspect result and focused Marlin follow-up';
  progress.runnerLifecycle ||= {};
  progress.runnerLifecycle.currentRunner = { pid: process.pid, status: result.status || 'failed', result: path.basename(resultPath), progress: path.basename(runProgressPath), sourceHash: tableSourceSha256 };
  fs.writeFileSync(progressPath, `${JSON.stringify(progress, null, 2)}\n`);
  await browser.close();
}
console.log(JSON.stringify({ status: result.status, assertions: result.assertions.map(({ name, status, error }) => ({ name, status, ...(error ? { error } : {}) })), screenshotCount: result.screenshots.length, eventCounts: { consoleSamples: result.events.console.length, uniqueConsoleSummaryEntries: Object.keys(result.events.consoleSummary).length, cdpConsoleStackSamples: result.events.cdpConsoleDetails.length, uniqueCdpConsoleSummaryEntries: Object.keys(result.events.cdpConsoleSummary).length, pageErrors: result.events.pageErrors.length, requestFailures: result.events.requestFailures.length, httpErrors: result.events.httpErrors.length }, unclassifiedConsoleErrors: result.unclassifiedConsoleErrors?.map(item => ({ text: item.text, count: item.count, stack: item.first?.stackTrace, trace: item.first?.trace })), apiWrites: result.apiWrites }, null, 2));
if (result.status !== 'passed') process.exitCode = 1;
