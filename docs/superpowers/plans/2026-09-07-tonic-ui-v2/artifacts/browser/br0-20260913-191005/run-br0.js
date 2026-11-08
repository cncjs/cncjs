const { chromium } = require('/Applications/ChatGPT.app/Contents/Resources/cua_node/lib/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ART = path.resolve('docs/superpowers/plans/2026-09-07-tonic-ui-v2/artifacts/browser/br0-20260913-191005');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const logFile = path.join(ART, 'browser-run.log');
const log = (event, data = {}) => {
  const line = JSON.stringify({ ts: new Date().toISOString(), event, ...data });
  fs.appendFileSync(logFile, line + '\n');
  console.log(line);
};
const save = (name, content) => fs.writeFileSync(path.join(ART, name), content);
const safe = (name) => name.replace(/[^a-zA-Z0-9_.-]/g, '_');

(async () => {
  fs.mkdirSync(ART, { recursive: true });
  const profile = fs.mkdtempSync('/tmp/cncjs-br0-profile-');
  log('profile-created', { profile });
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--disable-gpu', '--no-sandbox'] });
  log('browser-launched', { version: browser.version(), executablePath: CHROME, headless: true, gpu: 'disabled-by-flag' });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: 'light' });
  const page = await context.newPage();
  const consoleEvents = [];
  const pageErrors = [];
  const requests = [];
  page.on('console', m => { const e = { type: m.type(), text: m.text() }; consoleEvents.push(e); log('console', e); });
  page.on('pageerror', e => { const x = { text: String(e) }; pageErrors.push(x); log('pageerror', x); });
  page.on('request', r => requests.push({ method: r.method(), url: r.url() }));
  page.on('response', r => { if (r.status() >= 400) log('http-error', { status: r.status(), url: r.url() }); });
  const snapshot = async (name) => {
    save(`${name}.html`, await page.content());
    save(`${name}.aria.txt`, await page.locator('body').ariaSnapshot({ timeout: 10000 }).catch(e => `ARIA_ERROR ${e}`));
    await page.screenshot({ path: path.join(ART, `${name}.png`), fullPage: true });
    log('evidence-saved', { name, url: page.url(), title: await page.title() });
  };
  const action = async (name, fn) => {
    log('action-before', { name });
    const started = Date.now();
    try { const result = await fn(); log('action-after', { name, elapsed_ms: Date.now() - started, result }); return result; }
    catch (e) { log('action-failed', { name, elapsed_ms: Date.now() - started, error: String(e), stack: e.stack }); throw e; }
  };

  await action('goto-workspace', () => page.goto('http://127.0.0.1:8000', { waitUntil: 'domcontentloaded', timeout: 90000 }));
  await page.waitForTimeout(3000);
  await snapshot('anonymous-workspace-1440x900');
  await action('set-viewport-768x900', async () => { await page.setViewportSize({ width: 768, height: 900 }); await page.waitForTimeout(1000); });
  await snapshot('anonymous-workspace-768x900');
  await action('set-viewport-1440x900', () => page.setViewportSize({ width: 1440, height: 900 }));

  const bodyText = await page.locator('body').innerText();
  save('initial-body.txt', bodyText);
  log('initial-state', { text: bodyText.slice(0, 2000) });
  const selects = await page.locator('select').count();
  log('select-count', { selects });
  for (let i = 0; i < selects; i++) log('select-options', { i, options: await page.locator('select').nth(i).locator('option').allTextContents() });

  page.setDefaultTimeout(90000);
  const portControl = page.locator('#react-select-2-input');
  await action('select-port', async () => {
    await portControl.click({ timeout: 90000 });
    await page.getByText('/tmp/ttyGRBL', { exact: true }).click({ timeout: 90000 });
  });
  const state = await page.locator('button').evaluateAll(btns => btns.map(b => ({ text: b.innerText, aria: b.getAttribute('aria-label'), disabled: b.disabled, title: b.title }))); 
  save('post-port-button-state.json', JSON.stringify(state, null, 2));
  await snapshot('post-port-selection-before-open');
  log('post-port-state', { buttons: state, text: (await page.locator('body').innerText()).slice(0, 3000) });

  await action('select-controller-grbl', async () => {
    const c = page.locator('#react-select-1-input');
    if (await c.count()) { await c.click({ timeout: 90000 }); await page.getByText('Grbl', { exact: true }).last().click({ timeout: 90000 }); }
  });
  await action('select-baud-115200', async () => {
    const b = page.locator('#react-select-3-input');
    if (await b.count()) { await b.click({ timeout: 90000 }); await page.getByText('115200', { exact: true }).last().click({ timeout: 90000 }); }
  });
  const open = page.getByRole('button', { name: /^open$/i }).first();
  log('open-state-before', { count: await open.count(), disabled: await open.isDisabled().catch(() => null), text: await open.innerText().catch(() => null) });
  await action('open-connection', () => open.click({ timeout: 90000 }));
  await page.waitForTimeout(3000);
  await snapshot('connected-welcome-status');
  save('network-requests.json', JSON.stringify(requests, null, 2));
  save('console-events.json', JSON.stringify(consoleEvents, null, 2));
  save('page-errors.json', JSON.stringify(pageErrors, null, 2));
  await browser.close();
  log('complete');
})().catch(async e => { log('runner-failed', { error: String(e) }); process.exitCode = 1; });
