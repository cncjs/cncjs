import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '/tmp/cncjs-r6-playwright/node_modules/playwright/index.mjs';

const artifactDir = path.dirname(new URL(import.meta.url).pathname);
const headless = process.env.R6_HEADLESS !== '0';
const viewport = { width: 1440, height: 900 };
const events = { console: [], pageErrors: [], unhandledRejections: [], requestFailures: [], httpErrors: [] };
const browser = await chromium.launch({ headless, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport, deviceScaleFactor: 1, colorScheme: 'light' });
const page = await context.newPage();
await page.addInitScript(() => {
  window.addEventListener('unhandledrejection', event => {
    window.__r6UnhandledRejections ||= [];
    window.__r6UnhandledRejections.push(String(event.reason));
  });
});
page.on('console', message => events.console.push({ type: message.type(), text: message.text() }));
page.on('pageerror', error => events.pageErrors.push(String(error)));
page.on('requestfailed', request => events.requestFailures.push({ url: request.url(), error: request.failure()?.errorText }));
page.on('response', response => {
  if (response.status() >= 400) events.httpErrors.push({ status: response.status(), url: response.url() });
});

const response = await page.goto('http://127.0.0.1:8080/#/workspace', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.getByText('Connection', { exact: true }).waitFor({ timeout: 30000 });
await page.waitForTimeout(5000);
const runtime = await page.evaluate(() => {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  const debug = gl?.getExtension('WEBGL_debug_renderer_info');
  return {
    title: document.title,
    url: location.href,
    viewport: { width: innerWidth, height: innerHeight },
    devicePixelRatio,
    colorScheme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    themeAttributes: { html: document.documentElement.getAttribute('data-theme'), body: document.body.getAttribute('data-theme') },
    frameRegions: [...document.querySelectorAll('[aria-label$="widget" i], [aria-label*="widget" i]')].map(node => node.getAttribute('aria-label')),
    canvasCount: document.querySelectorAll('canvas').length,
    webglContext: Boolean(gl),
    webglVendor: debug ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) : null,
    webglRenderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null,
    bodyTextStart: document.body.innerText.slice(0, 2500),
  };
});
runtime.accessibleSnapshot = await page.locator('body').ariaSnapshot({ timeout: 10000 });
events.unhandledRejections = await page.evaluate(() => window.__r6UnhandledRejections || []);
await page.screenshot({ path: path.join(artifactDir, 'smoke-workspace-1440x900.png'), fullPage: true });
fs.writeFileSync(path.join(artifactDir, 'smoke-workspace-1440x900.aria.txt'), runtime.accessibleSnapshot);
fs.writeFileSync(path.join(artifactDir, 'smoke-runtime.json'), JSON.stringify({ browserVersion: browser.version(), headless, responseStatus: response?.status(), runtime, events }, null, 2) + '\n');
await browser.close();
console.log(JSON.stringify({ browserVersion: browser.version(), responseStatus: response?.status(), headless, runtime: { title: runtime.title, viewport: runtime.viewport, devicePixelRatio: runtime.devicePixelRatio, frameRegions: runtime.frameRegions, canvasCount: runtime.canvasCount, webglContext: runtime.webglContext, webglVendor: runtime.webglVendor, webglRenderer: runtime.webglRenderer }, events }, null, 2));
