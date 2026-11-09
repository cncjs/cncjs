import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '/tmp/cncjs-r6-playwright/node_modules/playwright/index.mjs';

const artifactDir = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const result = { browser: { name: 'Playwright bundled Chromium', version: browser.version(), viewport: '1440x900', dpr: 1, headless: true } };

try {
  await page.goto('http://127.0.0.1:8080/#/workspace', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.getByRole('region', { name: '3D Visualizer widget', exact: true }).waitFor();
  await page.waitForFunction(() => Boolean(window.__CNCJS_VISUALIZER_METRICS__), null, { timeout: 10000 });
  result.metrics = await page.evaluate(() => window.__CNCJS_VISUALIZER_METRICS__);
  result.webgl = await page.getByRole('region', { name: '3D Visualizer widget', exact: true }).locator('canvas').evaluate(canvas => {
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return gl ? {
      version: gl.getParameter(gl.VERSION),
      renderer: gl.getParameter(gl.RENDERER),
      vendor: gl.getParameter(gl.VENDOR),
      width: canvas.width,
      height: canvas.height,
    } : null;
  });
  await page.screenshot({ path: path.join(artifactDir, 'metrics-smoke-workspace.png'), fullPage: true });
} finally {
  fs.writeFileSync(path.join(artifactDir, 'metrics-smoke.json'), JSON.stringify(result, null, 2) + '\n');
  await browser.close();
}
