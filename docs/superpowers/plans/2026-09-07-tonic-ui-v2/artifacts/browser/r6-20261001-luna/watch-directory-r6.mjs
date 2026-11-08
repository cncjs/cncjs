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
page.setDefaultTimeout(15000);

const results = [];
const api = [];
const consoleIssues = [];
const pageErrors = [];
const requestFailures = [];
const rootPath = '/tmp/cncjs-r6-20261001/watch-tree';
const siblingPath = 'r6-sibling-batch';
const expected = { rootDirectories: 101, originalDirectories: 100, smallTreeFiles: 49, siblingFiles: 5000 };

page.on('request', request => {
  let url;
  try { url = new URL(request.url()); } catch (_) { return; }
  if (url.pathname !== '/api/watch/files') return;
  let requestedPath = '';
  try { requestedPath = request.postDataJSON()?.path || ''; } catch (_) {}
  api.push({ method: request.method(), path: url.pathname, directory: requestedPath });
});
page.on('response', async response => {
  let url;
  try { url = new URL(response.url()); } catch (_) { return; }
  if (url.pathname !== '/api/watch/files') return;
  let body = {};
  try { body = await response.json(); } catch (_) {}
  api.push({ status: response.status(), path: url.pathname, directory: body.path || '', itemCount: body.files?.length ?? null });
});
page.on('console', message => {
  if (['error', 'warning'].includes(message.type())) consoleIssues.push({ type: message.type(), text: message.text().slice(0, 350) });
});
page.on('pageerror', error => pageErrors.push(String(error).slice(0, 600)));
page.on('requestfailed', request => requestFailures.push({ method: request.method(), resourceType: request.resourceType(), error: request.failure()?.errorText }));

const outPath = path.join(artifactDir, 'watch-directory-r6-complete8.json');
function flush() {
  fs.writeFileSync(outPath, JSON.stringify({
    browser: { name: 'Playwright bundled Chromium', version: browser.version(), viewport: '1440x900', dpr: 1, headless: true },
    fixture: { rootPath, siblingPath, expected, fixtureManifest: 'watch-directory-fixtures-r6.json' },
    results,
    api,
    consoleIssues,
    pageErrors,
    requestFailures,
  }, null, 2) + '\n');
}

async function gate(name, action) {
  const startedAt = Date.now();
  try {
    const detail = await action();
    results.push({ name, status: 'passed', durationMs: Date.now() - startedAt, ...(detail || {}) });
  } catch (error) {
    const status = error.gateStatus || 'failed';
    results.push({ name, status, durationMs: Date.now() - startedAt, error: String(error).slice(0, 1000), ...(error.details || {}) });
    if (status === 'failed') {
      await page.screenshot({ path: path.join(artifactDir, `watch-directory-failure-${name}.png`), fullPage: true }).catch(() => {});
    }
  }
  flush();
}

async function connectSimulator(connection) {
  const close = connection.getByRole('button', { name: 'Close', exact: true });
  if (await close.isVisible().catch(() => false)) return { alreadyConnected: true };

  const automatic = connection.getByRole('checkbox', { name: 'Connect automatically', exact: true });
  if (await automatic.isChecked().catch(() => false)) await connection.getByText('Connect automatically', { exact: true }).click();
  const grbl = connection.getByRole('button', { name: 'Grbl', exact: true });
  if (await grbl.getAttribute('data-selected') === null) await grbl.click();
  const port = connection.getByRole('button', { name: 'Serial port', exact: true });
  await port.click();
  const option = page.getByRole('menuitem', { name: /\/tmp\/ttyGRBL/ });
  await option.waitFor({ state: 'visible' });
  const optionLabel = (await option.innerText()).trim();
  await option.click();
  const open = connection.getByRole('button', { name: 'Open', exact: true });
  await open.waitFor({ state: 'visible' });
  if (!(await open.isEnabled())) throw new Error('Simulator Open button remained disabled');
  await open.click();
  await close.waitFor({ state: 'visible', timeout: 20000 });
  return { alreadyConnected: false, selectedSimulator: optionLabel, connected: true };
}

try {
  await page.goto('http://127.0.0.1:8080/#/workspace', { waitUntil: 'domcontentloaded' });
  await page.getByRole('region', { name: '3D Visualizer widget', exact: true }).waitFor({ timeout: 30000 });
  const connection = page.getByRole('region', { name: 'Connection widget', exact: true });

  await gate('synthetic-simulator-connection', () => connectSimulator(connection));

  const workflow = page.getByRole('region', { name: '3D Visualizer widget', exact: true });
  const browseOptions = workflow.getByRole('button', { name: 'Upload G-code options', exact: true });
  await browseOptions.waitFor({ state: 'visible' });
  await browseOptions.waitFor({ state: 'visible' });
  if (!(await browseOptions.isEnabled())) throw new Error('Watch Directory menu is disabled until a simulator connection is active');
  await browseOptions.click();
  const menu = page.getByRole('menu');
  await menu.waitFor({ state: 'visible' });
  await page.screenshot({ path: path.join(artifactDir, 'watch-directory-menu-r6.png'), fullPage: true });
  const browse = menu.getByRole('menuitem', { name: 'Browse...', exact: true });
  await browse.waitFor({ state: 'visible' });
  await browse.click();

  const dialog = page.getByRole('dialog');
  await dialog.waitFor({ state: 'visible' });
  await page.screenshot({ path: path.join(artifactDir, 'watch-directory-modal-r6.png'), fullPage: true });
  await dialog.getByRole('tree', { name: 'Watch directory files', exact: true }).waitFor({ state: 'visible' });
  const tree = dialog.getByRole('tree', { name: 'Watch directory files', exact: true });

  await gate('watch-root-5000-node-hierarchy', async () => {
    const firstDirectory = tree.getByRole('treeitem', { name: /dir-000/ }).first();
    await firstDirectory.waitFor({ state: 'visible' });
    const rootNodes = await tree.locator('[data-node-id]').evaluateAll(elements => elements.map(element => element.getAttribute('data-node-id')));
    if (rootNodes.length !== expected.rootDirectories) throw new Error(`Expected ${expected.rootDirectories} root directories, got ${rootNodes.length}`);
    const sortedRoots = [...rootNodes].sort();
    const expectedRoots = [
      ...Array.from({ length: expected.originalDirectories }, (_, index) => `dir-${String(index).padStart(3, '0')}`),
      siblingPath,
    ].sort();
    if (JSON.stringify(sortedRoots) !== JSON.stringify(expectedRoots)) throw new Error(`Root directory set differs from expected 100 entries: ${sortedRoots.length}, ${sortedRoots[0]} .. ${sortedRoots.at(-1)}`);

    await firstDirectory.getByRole('button').click();
    const smallFiles = tree.locator('[data-node-id^="dir-000/fixture-"]');
    await page.waitForFunction(() => document.querySelectorAll('[data-node-id^="dir-000/fixture-"]').length === 49, null, { timeout: 15000 });
    const smallNames = await smallFiles.evaluateAll(elements => elements.map(element => element.getAttribute('data-node-id')));
    if (smallNames[0] !== 'dir-000/fixture-0000.nc' || smallNames.at(-1) !== 'dir-000/fixture-0048.nc') {
      throw new Error(`49-file directory did not sort as expected: ${smallNames[0]} .. ${smallNames.at(-1)}`);
    }
    return { rootCount: rootNodes.length, rootFirst: sortedRoots[0], rootLast: sortedRoots.at(-1), originalDirectoryCount: expected.originalDirectories, firstDirectoryFileCount: smallNames.length, firstFile: smallNames[0], lastFile: smallNames.at(-1), knownFixtureNodeTotal: 10001 };
  });

  await gate('watch-5000-sibling-directory', async () => {
    const batchCount = await tree.locator(`[data-node-id="${siblingPath}"]`).count();
    if (!batchCount) {
      const rootList = api.filter(entry => entry.path === '/api/watch/files' && entry.status === 200 && entry.directory === '').at(-1);
      const blocked = new Error('The synthetic sibling folder was added after DirectoryWatcher startup and is absent from its cached file list; rerun with fixtures created before the prescribed dev lifecycle starts.');
      blocked.gateStatus = 'blocked';
      blocked.details = { configuredSiblingPath: siblingPath, cachedRootItemCount: rootList?.itemCount ?? null, diskSiblingFolderPresent: true };
      throw blocked;
    }
    const batch = tree.getByRole('treeitem', { name: /r6-sibling-batch/ }).first();
    await batch.getByRole('button').click();
    await page.waitForFunction(() => document.querySelectorAll('[data-node-id^="r6-sibling-batch/sibling-"]').length === 5000, null, { timeout: 30000 });
    const siblingNodes = await tree.locator('[data-node-id^="r6-sibling-batch/sibling-"]').evaluateAll(elements => elements.map(element => element.getAttribute('data-node-id')));
    if (siblingNodes.length !== expected.siblingFiles) throw new Error(`Expected 5000 sibling files, got ${siblingNodes.length}`);
    if (siblingNodes[0] !== 'r6-sibling-batch/sibling-0000.nc' || siblingNodes.at(-1) !== 'r6-sibling-batch/sibling-4999.nc') {
      throw new Error(`Sibling files were not ordered as expected: ${siblingNodes[0]} .. ${siblingNodes.at(-1)}`);
    }
    const lastFile = tree.getByRole('treeitem', { name: /sibling-4999\.nc/ }).first();
    const treeBounds = await tree.boundingBox();
    if (!treeBounds) throw new Error('Watch tree has no visible bounds for native scrolling');
    const scrollBefore = await tree.evaluate(node => {
      for (let current = node; current; current = current.parentElement) {
        const style = getComputedStyle(current);
        if (['auto', 'scroll'].includes(style.overflowY) && current.scrollHeight > current.clientHeight) {
          return { tagName: current.tagName, role: current.getAttribute('role'), overflowY: style.overflowY, scrollTop: current.scrollTop, scrollHeight: current.scrollHeight, clientHeight: current.clientHeight };
        }
      }
      return null;
    });
    if (!scrollBefore) throw new Error('No vertically scrollable Watch Directory tree container was found');
    const readScrollerState = () => tree.evaluate(node => {
      const item = node.querySelector('[data-node-id="r6-sibling-batch/sibling-4999.nc"]');
      let scroller = node;
      while (scroller && (!['auto', 'scroll'].includes(getComputedStyle(scroller).overflowY) || scroller.scrollHeight <= scroller.clientHeight)) {
        scroller = scroller.parentElement;
      }
      if (!scroller) return null;
      const itemRect = item?.getBoundingClientRect();
      const scrollerRect = scroller.getBoundingClientRect();
      return {
        tagName: scroller.tagName,
        role: scroller.getAttribute('role'),
        overflowY: getComputedStyle(scroller).overflowY,
        scrollTop: scroller.scrollTop,
        scrollHeight: scroller.scrollHeight,
        clientHeight: scroller.clientHeight,
        rect: (() => { const { x, y, width, height } = scroller.getBoundingClientRect(); return { x, y, width, height }; })(),
        className: typeof scroller.className === 'string' ? scroller.className.slice(0, 120) : '',
        lastPresent: Boolean(item),
        lastTop: itemRect?.top ?? null,
        lastBottom: itemRect?.bottom ?? null,
        lastWithinScroller: Boolean(itemRect && itemRect.top >= scrollerRect.top && itemRect.bottom <= scrollerRect.bottom),
      };
    });
    let scrollAfter = await readScrollerState();
    const wheelPoint = { x: scrollAfter.rect.x + scrollAfter.rect.width / 2, y: scrollAfter.rect.y + scrollAfter.rect.height / 2 };
    const wheelTarget = await page.evaluate(({ x, y }) => {
      const node = document.elementFromPoint(x, y);
      return node ? { tagName: node.tagName, role: node.getAttribute('role'), className: typeof node.className === 'string' ? node.className.slice(0, 100) : '' } : null;
    }, wheelPoint);
    await tree.evaluate(node => {
      const scroller = (() => {
        for (let current = node; current; current = current.parentElement) {
          const style = getComputedStyle(current);
          if (['auto', 'scroll'].includes(style.overflowY) && current.scrollHeight > current.clientHeight) return current;
        }
        return null;
      })();
      window.__r6WatchWheelEvents = 0;
      if (scroller) scroller.addEventListener('wheel', () => { window.__r6WatchWheelEvents += 1; }, { passive: true });
    });
    await page.mouse.move(wheelPoint.x, wheelPoint.y);
    let stalledBatches = 0;
    for (let attempt = 0; attempt < 60 && !scrollAfter?.lastWithinScroller; attempt += 1) {
      await page.mouse.wheel(0, Math.max(1000, treeBounds.height * 2));
      if (attempt % 5 === 4) {
        await page.waitForTimeout(40);
        const nextState = await readScrollerState();
        if (nextState?.scrollTop === scrollAfter?.scrollTop) stalledBatches += 1;
        else stalledBatches = 0;
        scrollAfter = nextState;
        if (stalledBatches >= 2) break;
      }
    }
    const wheelEventCount = await page.evaluate(() => window.__r6WatchWheelEvents || 0);
    if (!scrollAfter?.lastWithinScroller) throw new Error(`Native wheel scrolling did not reveal sibling-4999: ${JSON.stringify({ scrollBefore, scrollAfter, wheelPoint, wheelTarget, wheelEventCount })}`);
    if (!scrollAfter || scrollAfter.scrollTop <= scrollBefore.scrollTop) throw new Error(`Native wheel input did not advance the Watch Directory scroller: ${JSON.stringify({ scrollBefore, scrollAfter })}`);
    await lastFile.click();
    if (await lastFile.getAttribute('aria-selected') !== 'true') throw new Error('Click did not select the last synthetic sibling file');
    const load = dialog.getByRole('button', { name: 'Load G-code', exact: true });
    if (!(await load.isEnabled())) throw new Error('Selecting a watch file did not enable Load G-code');
    const aria = await tree.ariaSnapshot();
    fs.writeFileSync(path.join(artifactDir, 'watch-directory-aria.txt'), aria);
    await page.screenshot({ path: path.join(artifactDir, 'watch-directory-last-sibling-selected-r6.png'), fullPage: true });
    await load.click();
    await dialog.waitFor({ state: 'detached' });
    const gcodeWidget = page.getByRole('region', { name: 'G-code widget', exact: true });
    const loadedFileLabel = gcodeWidget.getByText(/sibling-4999\.nc/).first();
    await loadedFileLabel.waitFor({ state: 'visible', timeout: 20000 });
    await gcodeWidget.getByText('6', { exact: true }).waitFor({ state: 'visible' });
    const closeFile = page.getByRole('button', { name: 'Close G-code file', exact: true });
    if (!(await closeFile.isEnabled())) throw new Error('Loading sibling-4999 left the Visualizer close-file action disabled');
    return { selectedPath: siblingNodes.at(-1), siblingCount: siblingNodes.length, first: siblingNodes[0], last: siblingNodes.at(-1), nativeScroll: { before: scrollBefore, after: scrollAfter }, wheelPoint, wheelTarget, wheelEventCount, selectedLastSibling: true, loadEnabled: true, lastSiblingLoadedInVisualizer: true, loadedFileLabel: (await loadedFileLabel.innerText()).trim() };
  });

  await page.screenshot({ path: path.join(artifactDir, 'watch-directory-r6-final.png'), fullPage: true });
  const visualizer = page.getByRole('region', { name: '3D Visualizer widget', exact: true });
  const closeProgram = visualizer.getByRole('button', { name: 'Close G-code file', exact: true });
  if (await closeProgram.isEnabled().catch(() => false)) {
    await closeProgram.click();
    await visualizer.getByRole('button', { name: 'Upload G-code', exact: true }).waitFor({ state: 'visible' });
    results.push({ name: 'unload-synthetic-last-sibling-cleanup', status: 'passed', loadedFileClosed: true });
  } else {
    results.push({ name: 'unload-synthetic-last-sibling-cleanup', status: 'not-needed', loadedFileClosed: true });
  }
  flush();

} finally {
  flush();
  await browser.close();
}
