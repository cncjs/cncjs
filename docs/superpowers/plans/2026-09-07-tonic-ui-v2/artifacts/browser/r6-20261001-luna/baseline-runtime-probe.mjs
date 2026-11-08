import fs from 'node:fs';
import path from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/tmp/cncjs-r6-playwright/node_modules/playwright/index.mjs');
const artifactDir = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const result = { browser: { version: browser.version(), viewport: '1440x900', dpr: 1 }, errors: [], consoleIssues: [], apiResponses: [], failedRequests: [] };
page.on('pageerror', error => result.errors.push(String(error).slice(0, 1000)));
page.on('console', message => { if (['error', 'warning'].includes(message.type())) result.consoleIssues.push({ type: message.type(), text: message.text().slice(0, 500) }); });
page.on('requestfailed', request => result.failedRequests.push({ url: request.url().replace(/\?.*/, ''), error: request.failure()?.errorText }));
page.on('response', response => {
  const url = new URL(response.url());
  if (url.pathname.startsWith('/api/')) result.apiResponses.push({ method: response.request().method(), path: url.pathname, status: response.status() });
});
try {
  await page.goto('http://127.0.0.1:8082/#/workspace', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.getByRole('region', { name: /3D Visualizer widget/i }).waitFor({ timeout: 20000 });
  await page.waitForTimeout(1000);
  result.status = 'workspace-rendered';
  result.hash = await page.evaluate(() => location.hash);
  result.accessibility = await page.evaluate(() => ({
    regions: [...document.querySelectorAll('[role="region"]')].map(el => ({ label: el.getAttribute('aria-label') || '', text: el.innerText.slice(0, 100) })),
    buttons: [...document.querySelectorAll('button')].slice(0, 100).map(el => ({ label: el.getAttribute('aria-label') || '', title: el.getAttribute('title') || '', text: el.innerText.trim().replace(/\s+/g, ' ').slice(0, 100), disabled: el.disabled })),
    fields: [...document.querySelectorAll('input,[role="combobox"],[data-test="connection-serial-port"]')].slice(0, 40).map(el => ({ tag: el.tagName, id: el.id || '', role: el.getAttribute('role') || '', label: el.getAttribute('aria-label') || '', labelledby: el.getAttribute('aria-labelledby') || '', placeholder: el.getAttribute('placeholder') || '', className: typeof el.className === 'string' ? el.className.slice(0, 100) : '', disabled: Boolean(el.disabled) })),
    fileInputs: document.querySelectorAll('input[type="file"]').length,
  }));
  result.visualizer = await page.getByRole('region', { name: /3D Visualizer widget/i }).evaluate(el => ({ canvasCount: el.querySelectorAll('canvas').length, rect: (() => { const r = el.getBoundingClientRect(); return { width: r.width, height: r.height }; })() }));
  result.webgl = await page.getByRole('region', { name: /3D Visualizer widget/i }).locator('canvas').evaluate(canvas => { const gl = canvas.getContext('webgl2') || canvas.getContext('webgl'); return gl ? { version: gl.getParameter(gl.VERSION), renderer: gl.getParameter(gl.RENDERER), vendor: gl.getParameter(gl.VENDOR), width: canvas.width, height: canvas.height } : null; });
  result.baselineMetrics = await page.evaluate(() => window.__R6_BASELINE_METRICS__ || null);
  await page.screenshot({ path: path.join(artifactDir, 'baseline-workspace-smoke.png') });
} catch (error) {
  result.status = 'failed';
  result.error = String(error).slice(0, 1200);
  await page.screenshot({ path: path.join(artifactDir, 'baseline-workspace-failure.png'), fullPage: true }).catch(() => {});
} finally {
  result.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(artifactDir, 'baseline-runtime-probe.json'), JSON.stringify(result, null, 2) + '\n');
  await browser.close();
}
