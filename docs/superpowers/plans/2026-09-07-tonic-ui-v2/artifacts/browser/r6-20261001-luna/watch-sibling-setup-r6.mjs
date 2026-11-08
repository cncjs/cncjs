import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const playwrightModule = process.env.PLAYWRIGHT_MODULE || '/tmp/cncjs-r6-playwright/node_modules/playwright/index.mjs';
const { chromium } = await import(pathToFileURL(playwrightModule).href);
const artifactDir = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  storageState: process.env.R6_STORAGE_STATE,
});
const page = await context.newPage();
const resultPath = path.join(artifactDir, 'watch-sibling-setup-r6.json');
const result = {
  fixture: {
    source: '/tmp/cncjs-r6-20261001/watch-siblings',
    destination: '/tmp/cncjs-r6-20261001/watch-tree',
    count: 5000,
    naming: 'sibling-NNNN.nc',
    content: '(synthetic R6 fixture NNNNN)\\nG21\\nG90\\nG1 X1 Y1 F600\\nM30\\n',
  },
  method: 'authenticated same-origin PUT /api/watch/file, bounded concurrent batches',
  responses: { firstWriteStatus: null, firstObservedByWatcher: false, remainingWriteSuccesses: 0, finalRootEntryCount: null },
};
const flush = () => fs.writeFileSync(resultPath, JSON.stringify(result, null, 2) + '\n');

try {
  await page.goto('http://127.0.0.1:8080/#/workspace', { waitUntil: 'domcontentloaded' });
  await page.getByRole('region', { name: '3D Visualizer widget', exact: true }).waitFor({ timeout: 30000 });
  const token = await page.evaluate(() => {
    try {
      return JSON.parse(localStorage.getItem('cnc') || '{}').state?.session?.token || '';
    } catch (_) {
      return '';
    }
  });
  if (!token) throw new Error('Authenticated browser state did not hydrate a session token');

  const write = async (index) => {
    const file = `sibling-${String(index).padStart(4, '0')}.nc`;
    const data = `(synthetic R6 fixture ${String(index).padStart(5, '0')})\nG21\nG90\nG1 X1 Y1 F600\nM30\n`;
    return page.evaluate(async ({ token, file, data }) => {
      const response = await fetch('/api/watch/file', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ file, data }),
      });
      return { status: response.status };
    }, { token, file, data }).then(response => response.status);
  };

  result.responses.firstWriteStatus = await write(0);
  if (result.responses.firstWriteStatus !== 200) throw new Error(`Synthetic watcher write returned HTTP ${result.responses.firstWriteStatus}`);
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const names = await page.evaluate(async ({ token }) => {
      const response = await fetch('/api/watch/files', { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) return { status: response.status, names: [] };
      const body = await response.json();
      return { status: response.status, names: (body.files || []).map(file => file.name) };
    }, { token });
    if (names.status !== 200) throw new Error(`Watch listing returned HTTP ${names.status}`);
    if (names.names.includes('sibling-0000.nc')) {
      result.responses.firstObservedByWatcher = true;
      break;
    }
    await page.waitForTimeout(250);
  }
  flush();
  if (!result.responses.firstObservedByWatcher) throw new Error('Directory watcher did not expose the first created sibling file');

  const batchSize = 100;
  const concurrency = 10;
  for (let start = 1; start < 5000; start += batchSize) {
    const indexes = Array.from({ length: Math.min(batchSize, 5000 - start) }, (_, offset) => start + offset);
    const statuses = await page.evaluate(async ({ token, indexes, concurrency }) => {
      const queue = [...indexes];
      const statuses = [];
      await Promise.all(Array.from({ length: concurrency }, async () => {
        while (queue.length) {
          const index = queue.shift();
          const file = `sibling-${String(index).padStart(4, '0')}.nc`;
          const data = `(synthetic R6 fixture ${String(index).padStart(5, '0')})\nG21\nG90\nG1 X1 Y1 F600\nM30\n`;
          const response = await fetch('/api/watch/file', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ file, data }),
          });
          statuses.push(response.status);
        }
      }));
      return statuses;
    }, { token, indexes, concurrency });
    const successes = statuses.filter(status => status === 200).length;
    result.responses.remainingWriteSuccesses += successes;
    if (successes !== indexes.length) throw new Error(`Batch starting ${start} wrote ${successes}/${indexes.length} fixture files`);
    flush();
  }

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const root = await page.evaluate(async ({ token }) => {
      const response = await fetch('/api/watch/files', { headers: { Authorization: `Bearer ${token}` } });
      const body = response.ok ? await response.json() : { files: [] };
      return { status: response.status, count: body.files?.length ?? 0, names: body.files?.map(file => file.name) || [] };
    }, { token });
    if (root.status !== 200) throw new Error(`Final watch listing returned HTTP ${root.status}`);
    if (root.names.includes('sibling-0000.nc') && root.names.includes('sibling-4999.nc')) {
      result.responses.finalRootEntryCount = root.count;
      break;
    }
    await page.waitForTimeout(250);
  }
  if (result.responses.remainingWriteSuccesses !== 4999 || result.responses.finalRootEntryCount !== 5100) {
    throw new Error(`Expected 4,999 remaining writes and 5,100 root entries; got ${result.responses.remainingWriteSuccesses} and ${result.responses.finalRootEntryCount}`);
  }
  result.status = 'passed';
} catch (error) {
  result.status = 'failed';
  result.error = String(error).slice(0, 800);
  process.exitCode = 1;
} finally {
  flush();
  await browser.close();
}
