import fs from 'node:fs';
import path from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/tmp/cncjs-r6-playwright/node_modules/playwright/index.mjs');
const artifactDir = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const result = { browser: browser.version(), status: 'started' };
try {
  await page.goto('http://127.0.0.1:8082/#/workspace', { waitUntil: 'domcontentloaded' });
  const connection = page.getByRole('region', { name: 'Connection widget', exact: true });
  await connection.waitFor();
  await connection.getByRole('button', { name: 'Refresh', exact: true }).first().click();
  await page.waitForTimeout(1500);
  result.beforeClick = await page.evaluate(() => ({
    text: document.querySelector('[data-test="connection-serial-port"]')?.innerText || '',
    optionCount: document.querySelectorAll('[role="option"]').length,
    bodyHasPort: document.body.innerText.includes('/tmp/ttyGRBL'),
    portContainer: (() => {
      const el = document.querySelector('[data-test="connection-serial-port"]');
      return el ? [...el.querySelectorAll('*')].slice(0, 12).map(child => ({ tag: child.tagName, role: child.getAttribute('role'), id: child.id, className: typeof child.className === 'string' ? child.className : '', text: child.innerText?.slice(0, 100) || '' })) : [];
    })(),
  }));
  await connection.locator('[data-test="connection-serial-port"] .connection-serial-port__control').click();
  await page.waitForTimeout(500);
  result.afterClick = await page.evaluate(() => ({
    optionCount: document.querySelectorAll('[role="option"]').length,
    options: [...document.querySelectorAll('[role="option"]')].map(el => ({ text: el.innerText.slice(0, 200), className: typeof el.className === 'string' ? el.className : '', ariaSelected: el.getAttribute('aria-selected') })),
    pathElements: [...document.querySelectorAll('*')].filter(el => el.childElementCount === 0 && el.innerText?.includes('/tmp/ttyGRBL')).map(el => ({ tag: el.tagName, className: typeof el.className === 'string' ? el.className : '', text: el.innerText.slice(0, 120) })).slice(0, 10),
    portText: document.querySelector('[data-test="connection-serial-port"]')?.innerText || '',
    menuText: [...document.querySelectorAll('[class*="menu"]')].slice(0, 8).map(el => el.innerText?.slice(0, 200) || ''),
  }));
  result.status = 'completed';
  await page.screenshot({ path: path.join(artifactDir, 'baseline-port-select-probe.png') });
} catch (error) { result.status = 'failed'; result.error = String(error).slice(0, 1000); }
finally {
  result.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(artifactDir, 'baseline-port-select-probe.json'), JSON.stringify(result, null, 2) + '\n');
  await browser.close();
}
