import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || '/Users/cheton/.nvm/versions/node/v24.21.0/lib/node_modules/playwright/index.mjs').href);
const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, storageState: process.env.R6_STORAGE_STATE });
const page = await context.newPage();
page.setDefaultTimeout(10000);
const issues = { errors: [], failures: [] };
page.on('pageerror', error => issues.errors.push(String(error)));
page.on('requestfailed', request => issues.failures.push({ type: request.resourceType(), error: request.failure()?.errorText }));
await page.goto('http://127.0.0.1:8080/#/workspace', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.getByText('Connection', { exact: true }).waitFor({ timeout: 30000 });
await page.waitForTimeout(1000);
const result = await page.evaluate(() => [...document.querySelectorAll('[role="region"][aria-label]')].map(region => ({
  name: region.getAttribute('aria-label'),
  rect: (() => { const r = region.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })(),
  buttons: [...region.querySelectorAll('button')].map(button => ({
    name: button.getAttribute('aria-label') || '',
    title: button.getAttribute('title') || '',
    text: (button.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 100),
    disabled: button.disabled,
    expanded: button.getAttribute('aria-expanded'),
  })),
  inputs: [...region.querySelectorAll('input,textarea')].map(input => ({
    name: input.getAttribute('aria-label') || input.getAttribute('placeholder') || '',
    type: input.type || input.tagName.toLowerCase(),
    disabled: input.disabled,
  })),
  text: region.innerText.slice(0, 220).replace(/\s+/g, ' '),
})));
const output = { browserVersion: browser.version(), viewport: '1440x900', dpr: 1, result, issues };
fs.writeFileSync(path.join(artifactDir, 'widget-inspection-r6.json'), JSON.stringify(output, null, 2) + '\n');
await page.close();
await context.close();
await browser.close();
console.log(JSON.stringify(output, null, 2));
