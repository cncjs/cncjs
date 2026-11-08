import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '/tmp/cncjs-r6-playwright/node_modules/playwright/index.mjs';
const artifactDir = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
page.setDefaultTimeout(6000);
await page.goto('http://127.0.0.1:8080/#/workspace', { waitUntil: 'domcontentloaded' });
await page.getByText('Connection', { exact: true }).waitFor();
await page.getByRole('button', { name: /Manage Widgets \(/ }).first().click();
const dialog = page.getByRole('dialog');
await dialog.waitFor({ state: 'visible' });
const snapshot = await page.locator('body').ariaSnapshot();
fs.writeFileSync(path.join(artifactDir, 'manager-probe-text.txt'), await dialog.innerText());
const details = await page.evaluate(() => [...document.querySelectorAll('[role="dialog"] input, [role="dialog"] button, [role="dialog"] [role="checkbox"]')].map(node => ({
  tag: node.tagName,
  type: node.type || null,
  role: node.getAttribute('role'),
  label: node.getAttribute('aria-label'),
  checked: node.checked ?? null,
  text: node.innerText,
  outer: node.outerHTML.slice(0, 500),
})));
fs.writeFileSync(path.join(artifactDir, 'manager-probe.aria.txt'), snapshot);
fs.writeFileSync(path.join(artifactDir, 'manager-probe.json'), JSON.stringify(details, null, 2));
await page.screenshot({ path: path.join(artifactDir, 'manager-probe.png') });
console.log(JSON.stringify(details, null, 2));
await browser.close();
