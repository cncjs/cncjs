import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const playwrightModule = process.env.PLAYWRIGHT_MODULE || `${process.env.HOME}/.nvm/versions/node/v24.21.0/lib/node_modules/playwright/index.mjs`;
const { chromium } = await import(pathToFileURL(playwrightModule).href);
const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const origin = process.env.V3_BASE_URL || 'http://127.0.0.1:8080';
const revision = 'f050804ef6b485b0190f29557d79df43f53316b0';
const tableSource = path.resolve(process.cwd(), 'src/app/pages/Administration/table/useResourceTable.js');
const tableSourceSha256 = createHash('sha256').update(fs.readFileSync(tableSource)).digest('hex');
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const report = {
  task: 'V3-V post-table-fix Administration route navigation comparison',
  revision,
  sourceContext: {
    dirtyFiles: [],
    tableSourceSha256,
    devHmrEvidence: 'lifecycle.log contains useResourceTable.js in Webpack built modules and webpack compiled successfully'
  },
  browser: { name: 'Playwright bundled Chromium', version: browser.version(), headless: true },
  scenarios: [],
  startedAt: new Date().toISOString()
};

async function runScenario(mode) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: 'light' });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.setDefaultNavigationTimeout(30000);
  const scenario = {
    mode,
    browserContextIsolated: true,
    gate: 'startup',
    action: 'launch fresh context',
    actions: [],
    console: [],
    cdpConsole: [],
    pageErrors: [],
    requestFailures: [],
    httpErrors: [],
    apiWrites: [],
    screenshots: []
  };
  const mark = action => {
    scenario.action = action;
    scenario.actions.push({ action, at: new Date().toISOString() });
  };
  const cdp = await context.newCDPSession(page);
  await cdp.send('Runtime.enable');
  page.on('console', msg => {
    const item = { type: msg.type(), text: msg.text(), location: msg.location(), gate: scenario.gate, action: scenario.action, at: new Date().toISOString() };
    if (scenario.console.length < 250) scenario.console.push(item);
  });
  cdp.on('Runtime.consoleAPICalled', event => {
    const text = event.args.map(arg => arg.value !== undefined ? arg.value : arg.description !== undefined ? arg.description : arg.unserializableValue !== undefined ? arg.unserializableValue : '[unavailable]').map(value => typeof value === 'string' ? value : JSON.stringify(value)).join(' ');
    const item = {
      type: event.type === 'warning' ? 'warning' : event.type,
      text,
      location: event.stackTrace?.callFrames?.[0] ? { url: event.stackTrace.callFrames[0].url, lineNumber: event.stackTrace.callFrames[0].lineNumber, columnNumber: event.stackTrace.callFrames[0].columnNumber } : null,
      stackTrace: (event.stackTrace?.callFrames || []).map(frame => ({ functionName: frame.functionName, url: frame.url, lineNumber: frame.lineNumber, columnNumber: frame.columnNumber })),
      gate: scenario.gate,
      action: scenario.action,
      at: new Date().toISOString()
    };
    if (scenario.cdpConsole.length < 300) scenario.cdpConsole.push(item);
  });
  page.on('pageerror', error => scenario.pageErrors.push({ message: error.message, stack: error.stack || '', gate: scenario.gate, action: scenario.action, at: new Date().toISOString() }));
  page.on('requestfailed', request => scenario.requestFailures.push({ method: request.method(), type: request.resourceType(), url: new URL(request.url()).origin + new URL(request.url()).pathname, error: request.failure()?.errorText || '', gate: scenario.gate, action: scenario.action }));
  page.on('request', request => {
    const url = new URL(request.url());
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method()) && url.pathname.startsWith('/api/')) scenario.apiWrites.push({ method: request.method(), path: url.pathname });
  });
  page.on('response', response => {
    if (response.status() >= 400) scenario.httpErrors.push({ status: response.status(), url: new URL(response.url()).origin + new URL(response.url()).pathname, gate: scenario.gate, action: scenario.action });
  });

  try {
    scenario.gate = 'initial workspace';
    mark('page.goto #/workspace');
    await page.goto(`${origin}/#/workspace`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.locator('main').waitFor({ state: 'visible', timeout: 30000 });
    await page.getByRole('region', { name: 'Connection widget', exact: true }).waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(350);

    scenario.gate = `Administration Commands via ${mode}`;
    if (mode === 'page.goto') {
      mark('page.goto #/administration/commands');
      await page.goto(`${origin}/#/administration/commands`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } else {
      mark('native click Administration navigation section');
      await page.getByText('Administration', { exact: true }).click();
      mark('native click Commands route button');
      await page.getByRole('menuitem', { name: 'Commands', exact: true }).click();
    }
    await page.locator('main').waitFor({ state: 'visible', timeout: 30000 });
    await page.getByRole('button', { name: 'Add', exact: true }).first().waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(700);
    scenario.url = page.url();
    scenario.routeHash = await page.evaluate(() => location.hash);
    scenario.pageDetails = await page.evaluate(() => ({
      title: document.title,
      mainText: document.querySelector('main')?.innerText.replace(/\s+/g, ' ').slice(0, 500) || '',
      tableCount: document.querySelectorAll('[role="table"]').length,
      addButtonCount: [...document.querySelectorAll('button')].filter(button => button.innerText.trim() === 'Add').length,
      unresolvedTokens: [...document.querySelectorAll('body *')]
        .filter(node => !['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(node.tagName) && node.children.length === 0)
        .map(node => {
          const style = getComputedStyle(node);
          const rect = node.getBoundingClientRect();
          const visible = rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0;
          if (!visible) return null;
          const text = (node.textContent || '').trim();
          const token = text.match(/\{\{[^}]{1,100}\}\}|\$\{[^}]{1,100}\}/)?.[0];
          const computed = { color: style.color, backgroundColor: style.backgroundColor, borderColor: style.borderColor };
          const unresolvedComputed = Object.entries(computed).filter(([, value]) => /var\(/.test(value)).map(([property, value]) => ({ property, value: value.slice(0, 120) }));
          return token || unresolvedComputed.length ? { text: text.slice(0, 100), token: token || null, computed: unresolvedComputed } : null;
        })
        .filter(Boolean)
        .slice(0, 20)
    }));
    mark('capture stable route screenshot with Playwright animations disabled');
    const screenshot = `screenshots/admin-navigation-${mode === 'page.goto' ? 'direct-goto' : 'native-click'}-after-table-fix-1440x900.png`;
    await page.screenshot({ path: path.join(artifactDir, screenshot), animations: 'disabled', caret: 'hide', timeout: 5000 });
    scenario.screenshots.push(screenshot);
    scenario.maximumUpdateDepthEvents = scenario.cdpConsole.filter(event => /Maximum update depth exceeded/i.test(event.text)).length;
    scenario.assertions = {
      routeResolved: scenario.routeHash === '#/administration/commands',
      listVisible: scenario.pageDetails.addButtonCount > 0,
      noMaximumUpdateDepth: scenario.maximumUpdateDepthEvents === 0,
      noPageErrors: scenario.pageErrors.length === 0,
      noRequestFailures: scenario.requestFailures.length === 0,
      noUserMutationApiWrites: scenario.apiWrites.every(write => write.path === '/api/signin')
    };
    scenario.authBootstrapRequests = scenario.apiWrites.filter(write => write.path === '/api/signin');
    scenario.userMutationApiWrites = scenario.apiWrites.filter(write => write.path !== '/api/signin');
    scenario.status = Object.values(scenario.assertions).every(Boolean) ? 'passed' : 'failed';
  } catch (error) {
    scenario.status = 'failed';
    scenario.fatalError = { message: String(error?.message || error), stack: error?.stack || '', gate: scenario.gate, action: scenario.action };
  } finally {
    scenario.maximumUpdateDepthEvents = scenario.cdpConsole.filter(event => /Maximum update depth exceeded/i.test(event.text)).length;
    scenario.elapsedMs = scenario.actions.length ? Date.now() - Date.parse(scenario.actions[0].at) : null;
    report.scenarios.push(scenario);
    await context.close();
  }
}

try {
  await runScenario('page.goto');
  await runScenario('native-click');
  report.status = report.scenarios.length === 2 && report.scenarios.every(scenario => scenario.status === 'passed') ? 'passed' : 'failed';
} finally {
  report.completedAt = new Date().toISOString();
  fs.writeFileSync(path.join(artifactDir, 'admin-navigation-compare-v3-after-table-fix.json'), `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
}
console.log(JSON.stringify({ status: report.status, tableSourceSha256, browser: report.browser, scenarios: report.scenarios.map(scenario => ({ mode: scenario.mode, status: scenario.status, routeHash: scenario.routeHash, maximumUpdateDepthEvents: scenario.maximumUpdateDepthEvents, pageErrors: scenario.pageErrors.length, requestFailures: scenario.requestFailures.length, fatalError: scenario.fatalError || null })) }, null, 2));
if (report.status !== 'passed') process.exitCode = 1;
