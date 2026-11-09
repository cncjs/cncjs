import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const playwrightModule = process.env.PLAYWRIGHT_MODULE || `${process.env.HOME}/.nvm/versions/node/v24.21.0/lib/node_modules/playwright/index.mjs`;
const { chromium } = await import(pathToFileURL(playwrightModule).href);
const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const screenshotDir = path.join(artifactDir, 'screenshots');
fs.mkdirSync(screenshotDir, { recursive: true });
const origin = process.env.V3_BASE_URL || 'http://127.0.0.1:8080';
const startedAt = Date.now();
const result = {
  task: 'V3-V React update-depth diagnostic: programmatic Animation.finish versus Playwright animations:disabled',
  revision: 'fce8ab51225fa6e2b36d45217b52a215f7ddeb03',
  browser: { name: 'Playwright bundled Chromium', version: null, headless: true, deviceScaleFactor: 1 },
  scenarios: [],
  status: 'in_progress'
};
const scenarios = [
  { name: 'baseline-route-no-screenshot', mode: 'no-screenshot', flow: 'route' },
  { name: 'finish-workspace-and-dialog-screenshots', mode: 'finish', flow: 'dialog-route' },
  { name: 'disabled-workspace-and-dialog-screenshots', mode: 'disabled', flow: 'dialog-route' },
  { name: 'finish-collapse-then-route', mode: 'finish', flow: 'collapse-route' },
  { name: 'disabled-collapse-then-route', mode: 'disabled', flow: 'collapse-route' },
  { name: 'finish-full-workspace-prefix-then-route', mode: 'finish', flow: 'full-prefix' },
  { name: 'disabled-full-workspace-prefix-then-route', mode: 'disabled', flow: 'full-prefix' }
];
const redact = value => String(value)
  .replace(/([?&]token=)[^&\s"']+/gi, '$1[redacted]')
  .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [redacted]')
  .replace(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g, '[redacted-jwt]');
const write = () => fs.writeFileSync(path.join(artifactDir, 'animation-diagnostic-v3-progress.json'), `${JSON.stringify(result, null, 2)}\n`);
function safeValue(remote) {
  if (remote.value !== undefined) return remote.value;
  if (remote.unserializableValue !== undefined) return remote.unserializableValue;
  return remote.description ?? '[unavailable]';
}

async function runScenario(spec) {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  result.browser.version = browser.version();
  const context = await browser.newContext({ viewport: { width: ['collapse-route', 'full-prefix'].includes(spec.flow) ? 768 : 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: 'light' });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  page.setDefaultNavigationTimeout(10000);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Runtime.enable');
  const scenario = {
    name: spec.name,
    mode: spec.mode,
    flow: spec.flow,
    browserProcessFresh: true,
    viewport: ['collapse-route', 'full-prefix'].includes(spec.flow) ? '768x900' : '1440x900',
    screenshots: [],
    actions: [],
    consoleEvents: [],
    consoleSummary: {},
    pageErrors: [],
    requestFailures: [],
    httpErrors: [],
    status: 'in_progress'
  };
  let activeAction = { name: 'browser launch', at: new Date().toISOString(), elapsedMs: 0 };
  const mark = name => {
    activeAction = { name, at: new Date().toISOString(), elapsedMs: Date.now() - startedAt };
    scenario.actions.push(activeAction);
  };
  const recordConsole = (type, rawArgs, frames = [], source = 'CDP') => {
    const args = rawArgs.map(safeValue);
    const message = redact(args.map(value => typeof value === 'string' ? value : JSON.stringify(value)).join(' '));
    const signature = `${source}\n${type}\n${message}\n${JSON.stringify(frames)}`;
    const entry = {
      type,
      message,
      rawArgs: args.map(value => redact(typeof value === 'string' ? value : JSON.stringify(value))),
      javascriptStack: frames.map(frame => ({ functionName: frame.functionName, url: redact(frame.url || ''), lineNumber: frame.lineNumber, columnNumber: frame.columnNumber })),
      reactComponentStack: args.map(value => typeof value === 'string' ? value : '').filter(value => /(?:^|\n)\s*(?:in |at )[^\n]+/.test(value)),
      source,
      at: new Date().toISOString(),
      elapsedMs: Date.now() - startedAt,
      action: { ...activeAction }
    };
    const summary = scenario.consoleSummary[signature] ||= { source, type, message, javascriptStack: entry.javascriptStack, count: 0, first: null, last: null, actions: [] };
    summary.count += 1;
    summary.first ||= entry;
    summary.last = entry;
    if (summary.actions.length < 20 && !summary.actions.some(item => item.name === activeAction.name)) summary.actions.push({ ...activeAction });
    if ((type === 'error' || /Maximum update depth/i.test(message)) && scenario.consoleEvents.length < 120) scenario.consoleEvents.push(entry);
  };
  page.on('console', message => {
    const location = message.location();
    const frames = location.url ? [{ functionName: '', url: location.url, lineNumber: location.lineNumber, columnNumber: location.columnNumber }] : [];
    recordConsole(message.type(), [{ value: message.text() }], frames, 'Playwright console event');
  });
  cdp.on('Runtime.consoleAPICalled', event => recordConsole(
    event.type === 'warning' ? 'warning' : event.type,
    event.args,
    event.stackTrace?.callFrames || [],
    'CDP Runtime.consoleAPICalled'
  ));
  cdp.on('Runtime.exceptionThrown', event => {
    const details = event.exceptionDetails || {};
    const frames = details.stackTrace?.callFrames || [];
    scenario.pageErrors.push({
      text: redact(details.text || ''),
      exception: redact(details.exception?.description || details.exception?.value || ''),
      javascriptStack: frames.map(frame => ({ functionName: frame.functionName, url: redact(frame.url || ''), lineNumber: frame.lineNumber, columnNumber: frame.columnNumber })),
      at: new Date().toISOString(),
      elapsedMs: Date.now() - startedAt,
      action: { ...activeAction }
    });
  });
  page.on('requestfailed', request => scenario.requestFailures.push({ method: request.method(), resourceType: request.resourceType(), url: redact(request.url()).split('?')[0], error: redact(request.failure()?.errorText || ''), action: { ...activeAction } }));
  page.on('response', response => { if (response.status() >= 400) scenario.httpErrors.push({ status: response.status(), url: redact(response.url()).split('?')[0], action: { ...activeAction } }); });
  const capture = async suffix => {
    const filename = `animation-diagnostic-${spec.name}-${suffix}.png`;
    mark(`screenshot ${filename}; Playwright animations:disabled${spec.mode === 'finish' ? ' after explicit Animation.finish comparison' : ''}`);
    try {
      if (spec.mode === 'finish') {
        mark(`programmatically finish finite animations before ${suffix} screenshot`);
        const finishReport = await Promise.race([
          page.evaluate(() => {
            const active = document.getAnimations().filter(animation => animation.playState === 'running' && Number.isFinite(animation.effect?.getComputedTiming()?.endTime));
            const list = active.map(animation => ({ type: animation.effect?.constructor?.name || 'unknown', currentTime: animation.currentTime, endTime: animation.effect?.getComputedTiming()?.endTime }));
            for (const animation of active) { try { animation.finish(); } catch (_) {} }
            return { finishedCount: active.length, active };
          }),
          new Promise(resolve => setTimeout(() => resolve({ timedOut: true }), 1000))
        ]);
        scenario.actions.at(-1).animationFinish = finishReport;
      }
      mark(`Playwright page.screenshot ${filename} animations:disabled`);
      await page.screenshot({ path: path.join(screenshotDir, filename), animations: 'disabled', caret: 'hide', timeout: 4000 });
      scenario.screenshots.push(path.join('screenshots', filename));
      return { screenshot: filename, status: 'saved' };
    } catch (error) {
      const failure = { screenshot: filename, status: 'failed', error: redact(error.message || error) };
      scenario.actions.at(-1).screenshotFailure = failure.error;
      return failure;
    }
  };
  const gotoRoute = async route => {
    mark(`navigate to ${route}`);
    try {
      await page.goto(`${origin}/#${route}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await page.locator('main').waitFor({ state: 'visible', timeout: 6000 });
      await page.waitForTimeout(200);
      return { route, status: 'loaded', mainText: (await page.locator('main').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 260) };
    } catch (error) {
      return { route, status: 'failed', error: redact(error.message || error) };
    }
  };

  try {
    scenario.navigation = await gotoRoute('/workspace');
    if (spec.flow === 'route') {
      scenario.navigationAfter = await gotoRoute('/administration/commands');
    } else if (spec.flow === 'dialog-route') {
      await capture('workspace');
      mark('click Manage Widgets to open Widget Manager dialog');
      await page.getByRole('button', { name: /Manage Widgets \(/ }).first().click();
      await page.getByRole('dialog').last().waitFor({ state: 'visible', timeout: 5000 }).catch(error => { scenario.dialogWaitError = redact(error.message || error); });
      await capture('widget-manager-open');
      await page.waitForTimeout(700);
      scenario.navigationAfter = await gotoRoute('/administration/commands');
    } else if (spec.flow === 'collapse-route') {
      for (const label of ['Hide left panel', 'Hide right panel']) {
        mark(`click ${label}`);
        await page.getByRole('button', { name: label, exact: true }).click();
      }
      scenario.collapseState = await page.evaluate(() => {
        const canvas = document.querySelector('[role="region"][aria-label="3D Visualizer widget"] canvas');
        const host = document.querySelector('[aria-label="3D Visualizer"]');
        if (!canvas || !host) return null;
        const cr = canvas.getBoundingClientRect();
        const hr = host.getBoundingClientRect();
        return { canvas: { width: cr.width, height: cr.height, drawingBufferWidth: canvas.width, drawingBufferHeight: canvas.height }, host: { x: hr.x, width: hr.width }, documentOverflowX: document.documentElement.scrollWidth > innerWidth };
      }).catch(error => ({ evaluationError: redact(error.message || error) }));
      await capture('panels-collapsed');
      await page.waitForTimeout(300);
      scenario.navigationAfter = await gotoRoute('/administration/commands');
    } else if (spec.flow === 'full-prefix') {
      mark('click responsive Toggle navigation at 768x900');
      await page.getByRole('button', { name: 'Toggle navigation', exact: true }).click();
      await capture('responsive-navigation-open');
      await page.setViewportSize({ width: 1440, height: 900 });
      scenario.navigationAt1440 = await gotoRoute('/workspace');
      mark('click Manage Widgets at 1440x900');
      const manager1440 = page.getByRole('button', { name: /Manage Widgets \(/ }).first();
      await manager1440.click();
      const dialog1440 = page.getByRole('dialog').last();
      await dialog1440.waitFor({ state: 'visible', timeout: 5000 }).catch(error => { scenario.dialog1440WaitError = redact(error.message || error); });
      await capture('widget-manager-1440');
      mark('press Tab inside 1440px dialog and Escape to close');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Escape');
      await page.setViewportSize({ width: 768, height: 900 });
      scenario.navigationAt768 = await gotoRoute('/workspace');
      mark('click Manage Widgets at 768x900');
      await page.getByRole('button', { name: /Manage Widgets \(/ }).first().click();
      const dialog768 = page.getByRole('dialog').last();
      await dialog768.waitFor({ state: 'visible', timeout: 5000 }).catch(error => { scenario.dialog768WaitError = redact(error.message || error); });
      await capture('widget-manager-768');
      mark('press Escape to close 768px Widget Manager dialog');
      await page.keyboard.press('Escape');
      for (const label of ['Hide left panel', 'Hide right panel']) {
        mark(`click ${label} after modal close`);
        await page.getByRole('button', { name: label, exact: true }).click();
      }
      await capture('panels-collapsed-after-modal');
      scenario.navigationAfter = await gotoRoute('/administration/commands');
    }
    await page.waitForTimeout(1000);
    if (Object.values(scenario.consoleSummary).some(item => /Maximum update depth exceeded/i.test(item.message))) {
      await capture('after-update-depth-warning');
    }
    scenario.status = 'completed';
  } catch (error) {
    scenario.status = 'failed';
    scenario.fatalError = redact(error.stack || error.message || error);
  } finally {
    scenario.consoleEventCount = Object.values(scenario.consoleSummary).reduce((sum, item) => sum + item.count, 0);
    scenario.maximumUpdateDepthCount = Object.values(scenario.consoleSummary).filter(item => item.source === 'CDP Runtime.consoleAPICalled' && /Maximum update depth exceeded/i.test(item.message)).reduce((sum, item) => sum + item.count, 0);
    scenario.completedAt = new Date().toISOString();
    result.scenarios.push(scenario);
    write();
    await browser.close().catch(() => {});
  }
}

for (const spec of scenarios) {
  await runScenario(spec);
  write();
}
result.status = result.scenarios.every(scenario => scenario.status === 'completed') ? 'completed' : 'partial';
result.completedAt = new Date().toISOString();
result.elapsedMs = Date.now() - startedAt;
fs.writeFileSync(path.join(artifactDir, 'animation-diagnostic-v3.json'), `${JSON.stringify(result, null, 2)}\n`);
const flat = result.scenarios.map(scenario => ({ name: scenario.name, status: scenario.status, maximumUpdateDepthCount: scenario.maximumUpdateDepthCount, consoleEventCount: scenario.consoleEventCount, screenshotCount: scenario.screenshots.length, navigationAfter: scenario.navigationAfter?.status || null }));
console.log(JSON.stringify({ status: result.status, browser: result.browser, scenarios: flat }, null, 2));
