import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const pwPath = process.env.PLAYWRIGHT_MODULE || `${process.env.HOME}/.nvm/versions/node/v24.21.0/lib/node_modules/playwright/index.mjs`;
const { chromium } = await import(pathToFileURL(pwPath).href);
const dir = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(dir, 'guide-focused-acceptance-v3.json');
const shotDir = path.join(dir, 'screenshots');
const origin = process.env.V3_BASE_URL || 'http://127.0.0.1:8080';
const revision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const sourceDiffSha256 = createHash('sha256').update(execFileSync('git', ['diff', '--', 'package.json', 'yarn.lock', 'src/app'])).digest('hex');
const scratch = process.env.V3_SCRATCH || '/tmp/cncjs-v3-guide-20261006-luna-0e46609d';
const importFixture = path.join(scratch, 'workspace-settings-import-fixture.json');
fs.mkdirSync(shotDir, { recursive: true });
fs.writeFileSync(importFixture, JSON.stringify({ version: '2.0.0-dev', state: {} }));

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: 'light' });
const page = await context.newPage();
page.setDefaultTimeout(10000);
page.setDefaultNavigationTimeout(30000);
const result = {
  task: 'V3-GV focused guide acceptance: navigation states, outside-close confirms, Axes errors/cards/drop, actual settings routes',
  revision,
  sourceDiffSha256,
  expectedSourceDiffSha256: 'f2d53df88181497311cbe2d154d32bf33bc7df23b787fb7c2e759c821f8401e9',
  model: { name: 'gpt-6-luna', reasoningEffort: 'xhigh', basis: 'user-selected active task/session assignment' },
  browser: { name: 'Playwright bundled Chromium', version: browser.version(), headless: true, deviceScaleFactor: 1 },
  runnerPid: process.pid,
  assertions: [],
  screenshots: [],
  actions: [],
  events: { pageErrors: [], requestFailures: [], httpErrors: [], consoleErrors: [], writes: [] },
  fixture: { path: importFixture, version: '2.0.0-dev', stateKeys: [], imported: false, macroCreated: false, macroExecuted: false, confirmationActions: 0, macroSource: 'browser-only GET /api/macros synthetic response; no macro record persisted' }
};
const redact = value => String(value)
  .replace(/([?&]token=)[^&\s"']+/gi, '$1[redacted]')
  .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [redacted]')
  .replace(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g, '[redacted-jwt]');
page.on('pageerror', e => result.events.pageErrors.push({ message: redact(e.message), stack: redact(e.stack || '') }));
page.on('requestfailed', r => result.events.requestFailures.push({ method: r.method(), type: r.resourceType(), url: redact(r.url()).split('?')[0], error: redact(r.failure()?.errorText || '') }));
page.on('response', r => { if (r.status() >= 400) result.events.httpErrors.push({ status: r.status(), url: redact(r.url()).split('?')[0] }); });
page.on('request', r => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(r.method())) {
    let pathname = '';
    try { pathname = new URL(r.url()).pathname; } catch (_) {}
    if (pathname.startsWith('/api/')) result.events.writes.push({ method: r.method(), path: pathname });
  }
});
page.on('console', m => { if (m.type() === 'error') result.events.consoleErrors.push({ text: redact(m.text()), location: m.location() }); });
await page.route('**/api/macros**', async route => {
  if (route.request().method() === 'GET') {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ records: [{ id: 'v3-guide-fixture-only', name: 'V3 guide visual fixture', content: '; visual validation fixture only' }] }) });
    return;
  }
  result.events.writes.push({ method: route.request().method(), path: new URL(route.request().url()).pathname, blocked: true, reason: 'focused modal fixture must not persist or delete a macro' });
  await route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: 'fixture mutation blocked by visual runner' }) });
});

async function save(name) {
  await page.waitForTimeout(220);
  const rel = `screenshots/${name}`;
  await page.screenshot({ path: path.join(dir, rel), animations: 'disabled', caret: 'hide', timeout: 5000 });
  result.screenshots.push(rel);
  flush();
  return rel;
}
function flush() { fs.writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`); }
async function go(route) {
  await page.goto(`${origin}/#${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.locator('main').waitFor({ state: 'visible', timeout: 20000 });
  await page.waitForTimeout(120);
}
async function gate(name, fn) {
  const t = Date.now();
  try { result.assertions.push({ name, status: 'passed', durationMs: Date.now() - t, detail: await fn() }); }
  catch (e) {
    const error = redact(e.stack || e.message || e).slice(0, 1800);
    const diagnostic = `focused-failure-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
    const screenshot = await save(diagnostic).catch(() => null);
    result.assertions.push({ name, status: 'failed', durationMs: Date.now() - t, error, screenshot });
  }
  flush();
}
async function styleSnapshot(locator) {
  return locator.evaluate(el => {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return { tag: el.tagName, text: (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 100), aria: el.getAttribute('aria-label'), selected: el.getAttribute('aria-selected'), active: el.matches(':active'), focus: el.matches(':focus'), color: s.color, background: s.backgroundColor, outline: s.outline, outlineColor: s.outlineColor, rect: { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) } };
  });
}
async function settledDialog() {
  const dlg = page.getByRole('dialog').last();
  await dlg.waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(350);
  const info = await dlg.evaluate(el => {
    const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
    return { text: el.innerText.replace(/\s+/g, ' ').slice(0, 420), opacity: s.opacity, visibility: s.visibility, rect: { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) } };
  });
  return { dlg, info };
}
async function outsideClick(dialog) {
  const rect = await dialog.boundingBox();
  const candidates = [[8, 8], [8, 880], [1432, 8], [1432, 880]];
  const [x, y] = candidates.find(([x, y]) => !rect || x < rect.x || x > rect.x + rect.width || y < rect.y || y > rect.y + rect.height) || [8, 8];
  await page.mouse.click(x, y);
  await page.waitForTimeout(350);
  await page.waitForFunction(() => [...document.querySelectorAll('[data-tonic="ModalOverlay"]')].every(el => {
    const s = getComputedStyle(el); const r = el.getBoundingClientRect();
    return s.visibility === 'hidden' || Number(s.opacity) < 0.01 || r.width === 0 || r.height === 0;
  }), { timeout: 5000 }).catch(() => {});
  return { point: { x, y }, stillVisible: await dialog.isVisible().catch(() => false) };
}

try {
  await go('/workspace');

  await gate('Header and SideNav focus hover active styles at 1440 and 768', async () => {
    const states = [];
    for (const width of [1440, 768]) {
      await page.setViewportSize({ width, height: 900 });
      await go('/workspace');
      const headerToggle = page.getByRole('button', { name: 'Toggle navigation', exact: true });
      await headerToggle.focus();
      const headerFocus = await styleSnapshot(headerToggle);
      await save(`guide-header-focus-${width}x900.png`);
      await headerToggle.hover();
      await page.waitForTimeout(250);
      const headerHover = await styleSnapshot(headerToggle);
      await save(`guide-header-hover-${width}x900.png`);
      await page.mouse.down();
      const headerActive = await styleSnapshot(headerToggle);
      await save(`guide-header-active-${width}x900.png`);
      await page.mouse.move(0, 890);
      await page.mouse.up();
      if (!headerFocus.focus || !headerHover.color || !headerActive.active) throw new Error(`Header state missing at ${width}: ${JSON.stringify({ headerFocus, headerHover, headerActive })}`);
      await headerToggle.click();
      let nav;
      let sideButtonStates = null;
      if (width < 1024) {
        nav = page.locator('[aria-label="Main navigation"]');
        await nav.waitFor({ state: 'visible', timeout: 7000 });
        await page.waitForTimeout(450);
        const closeNav = nav.getByRole('button', { name: 'Close navigation', exact: true });
        await closeNav.focus();
        const closeFocus = await styleSnapshot(closeNav);
        await closeNav.hover(); await page.waitForTimeout(250);
        const closeHover = await styleSnapshot(closeNav);
        await page.mouse.down(); const closeActive = await styleSnapshot(closeNav); await save(`guide-sidenav-close-active-${width}x900.png`); await page.mouse.move(0, 890); await page.mouse.up();
        await save(`guide-sidenav-close-focus-hover-${width}x900.png`);
        if (!closeFocus.focus || !closeHover.color || !closeActive.active) throw new Error(`SideNav button state missing: ${JSON.stringify({ closeFocus, closeHover, closeActive })}`);
        sideButtonStates = { focus: closeFocus, hover: closeHover, active: closeActive };
      } else {
        nav = page.locator('nav').first();
        await nav.waitFor({ state: 'visible', timeout: 7000 });
      }
      const selected = nav.locator('a[aria-selected="true"]').first();
      await selected.focus();
      const navFocus = await styleSnapshot(selected);
      await save(`guide-sidenav-focus-${width}x900.png`);
      await selected.hover();
      await page.waitForTimeout(250);
      const navHover = await styleSnapshot(selected);
      await save(`guide-sidenav-hover-${width}x900.png`);
      await page.mouse.down();
      const navActive = await styleSnapshot(selected);
      await save(`guide-sidenav-active-${width}x900.png`);
      await page.mouse.move(0, 890);
      await page.mouse.up();
      states.push({ width, header: { focus: headerFocus, hover: headerHover, active: headerActive }, sideNavButton: sideButtonStates, selectedNavLink: { programmaticFocusAcquired: navFocus.focus, hover: navHover, active: navActive } });
      if ((width < 1024 && !sideButtonStates) || navHover.selected !== 'true' || !navActive.active) throw new Error(`SideNav state missing at ${width}: ${JSON.stringify({ sideButtonStates, navFocus, navHover, navActive })}`);
      if (width < 1024) await page.getByRole('button', { name: 'Close navigation', exact: true }).click();
      else await headerToggle.click();
    }
    return { viewports: states };
  });

  await gate('Actual General Settings and Workspace Settings routes render in light and dark', async () => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const pages = [];
    for (const theme of ['light', 'dark']) {
      const headerMenu = page.locator('header[aria-label="Application header"] button[aria-haspopup="menu"]').last();
      await headerMenu.click();
      await page.getByRole('menuitem', { name: /Appearance:/ }).click();
      await page.getByText(theme === 'light' ? 'Light theme' : 'Dark theme', { exact: true }).last().click();
      await page.waitForTimeout(200);
      for (const [key, route, content] of [
        ['general', '/administration/general-settings', 'Controller'],
        ['workspace', '/administration/workspace-settings', 'Restore Defaults']
      ]) {
        await go(route);
        await page.getByText(content, { exact: key === 'workspace' }).first().waitFor({ state: 'visible', timeout: 10000 });
        const main = await page.locator('main').evaluate(el => {
          const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
          return { text: el.innerText.replace(/\s+/g, ' ').slice(0, 180), color: s.color, background: s.backgroundColor, rect: { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) }, overflowX: el.scrollWidth > el.clientWidth };
        });
        const file = `guide-${key}-settings-${theme}-1440x900.png`;
        await save(file);
        if (main.overflowX || !main.color || !main.background) throw new Error(`${key}/${theme} route semantic layout failed: ${JSON.stringify(main)}`);
        pages.push({ theme, key, route, main, screenshot: `screenshots/${file}` });
      }
    }
    return { pages };
  });

  await gate('Restore Defaults confirmation closes by outside pointer without confirming', async () => {
    await go('/administration/workspace-settings');
    await page.getByRole('button', { name: 'Restore Defaults', exact: true }).click();
    const { dlg, info } = await settledDialog();
    const screenshot = await save('guide-confirm-restore-defaults-open.png');
    const outside = await outsideClick(dlg);
    result.fixture.confirmationActions += 0;
    if (outside.stillVisible) throw new Error(`Restore Defaults dialog remained after outside click: ${JSON.stringify({ info, outside })}`);
    await save('guide-confirm-restore-defaults-outside-closed.png');
    return { dialog: info, outside, screenshot, confirmClicked: false };
  });

  await gate('Import Workspace Settings confirmation closes by outside pointer without importing', async () => {
    await go('/administration/workspace-settings');
    const chooserInput = page.locator('input[type="file"]').first();
    await chooserInput.setInputFiles(importFixture);
    await page.getByText('Are you sure you want to overwrite the workspace settings?', { exact: true }).waitFor({ state: 'visible', timeout: 8000 });
    const { dlg, info } = await settledDialog();
    const screenshot = await save('guide-confirm-import-settings-open.png');
    const outside = await outsideClick(dlg);
    if (outside.stillVisible) throw new Error(`Import confirmation remained after outside click: ${JSON.stringify({ info, outside })}`);
    await save('guide-confirm-import-settings-outside-closed.png');
    return { dialog: info, outside, screenshot, file: path.basename(importFixture), importClicked: false, mutationCount: 0 };
  });

  await gate('Confirm Delete Macro closes by outside pointer and does not delete', async () => {
    await go('/workspace');
    await page.waitForFunction(() => [...document.querySelectorAll('[data-tonic="ModalOverlay"]')].every(el => getComputedStyle(el).visibility !== 'visible' || Number(getComputedStyle(el).opacity) < 0.01), { timeout: 5000 }).catch(() => {});
    const fixtureName = 'V3 guide visual fixture';
    await page.getByRole('button', { name: `Edit macro: ${fixtureName}`, exact: true }).waitFor({ state: 'visible', timeout: 10000 });
    await page.getByRole('button', { name: `Edit macro: ${fixtureName}`, exact: true }).click();
    const editDialog = page.getByRole('dialog').last();
    await editDialog.waitFor({ state: 'visible' });
    await editDialog.getByRole('button', { name: 'Delete', exact: true }).click();
    const { dlg, info } = await settledDialog();
    if (!info.text.includes('Delete Macro') || !info.text.includes(fixtureName)) throw new Error(`Expected macro confirmation content missing: ${JSON.stringify(info)}`);
    const screenshot = await save('guide-confirm-delete-macro-open.png');
    const outside = await outsideClick(dlg);
    const dialogsAfter = await page.getByRole('dialog').count();
    const remainingText = dialogsAfter === 1 ? await page.getByRole('dialog').last().innerText().catch(() => '') : '';
    const confirmStillPresent = /Are you sure you want to delete this macro/i.test(remainingText);
    if (dialogsAfter !== 1 || confirmStillPresent || !await editDialog.isVisible().catch(() => false)) throw new Error(`Nested Delete Macro confirmation did not close cleanly by outside click: ${JSON.stringify({ info, outside, dialogsAfter, remainingText: remainingText.slice(0, 180) })}`);
    await save('guide-confirm-delete-macro-outside-closed.png');
    result.fixture.confirmationActions += 0;
    result.fixture.macroExecuted = false;
    await editDialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await editDialog.waitFor({ state: 'hidden', timeout: 5000 });
    await page.waitForTimeout(400);
    return { dialog: info, outside: { point: outside.point, confirmationVisibleAfter: confirmStillPresent, remainingDialogs: dialogsAfter }, screenshot, fixtureName, fixtureSource: 'synthetic GET response only', confirmClicked: false, macroExecuted: false, noMutation: true };
  });

  await gate('Axes Custom Commands required-field error is visible and semantic', async () => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await go('/workspace');
    const axes = page.getByRole('region', { name: 'Axes widget', exact: true });
    const showRight = page.getByRole('button', { name: 'Show right panel', exact: true });
    if (await showRight.isVisible().catch(() => false)) await showRight.click();
    await page.waitForTimeout(150);
    await axes.getByRole('button', { name: 'More options', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Settings', exact: true }).click();
    const settingsDialog = page.getByRole('dialog').last();
    await settingsDialog.getByRole('tab', { name: 'Custom Commands', exact: true }).click();
    await settingsDialog.getByRole('button', { name: 'New', exact: true }).click();
    const createDialog = page.getByRole('dialog').last();
    await createDialog.getByRole('button', { name: 'OK', exact: true }).click();
    await createDialog.getByText('This field is required.', { exact: true }).waitFor({ state: 'visible', timeout: 5000 });
    const error = await createDialog.getByText('This field is required.', { exact: true }).evaluate(el => {
      const s = getComputedStyle(el); return { text: el.innerText, color: s.color, fontSize: s.fontSize, rect: (() => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) }; })() };
    });
    const screenshot = await save('guide-axes-custom-command-required-error.png');
    if (!error.color || error.rect.width <= 0 || error.rect.height <= 0) throw new Error(`Required error not visible: ${JSON.stringify(error)}`);
    await createDialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll('[role="dialog"]').length === 1, { timeout: 5000 });
    await settingsDialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll('[role="dialog"]').length === 0, { timeout: 5000 });
    return { error, screenshot, submitWasBlank: true, validCommandSubmitted: false, bothDialogsCancelled: true };
  });

  await gate('Autolevel landing card hover and disconnected file-drop state', async () => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await go('/workspace');
    const showRight = page.getByRole('button', { name: 'Show right panel', exact: true });
    if (await showRight.isVisible().catch(() => false)) await showRight.click();
    const card = page.getByText(/PROBE NEW SURFACE/).first().locator('xpath=..');
    await card.waitFor({ state: 'visible', timeout: 8000 });
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
    const readCard = el => {
      let target = el;
      while (target && !String(target.className).includes('pathCard')) target = target.parentElement;
      target ||= el;
      const s = getComputedStyle(target);
      return { background: s.backgroundColor, border: s.borderColor, className: String(target.className), text: (target.innerText || '').replace(/\s+/g, ' ').slice(0, 130) };
    };
    const before = await card.evaluate(readCard);
    await card.hover();
    await page.waitForTimeout(280);
    const hovered = await card.evaluate(readCard);
    const cardShot = await save('guide-autolevel-card-hover.png');
    const dropRoot = await page.locator('main').evaluate(main => [...main.querySelectorAll('*')].find(el => typeof el.className === 'string' && /workspace/i.test(el.className))?.outerHTML.slice(0, 300));
    const dragTarget = page.locator('[aria-label="3D Visualizer widget"]').first();
    await dragTarget.dispatchEvent('dragenter', { dataTransfer: await page.evaluateHandle(() => {
      const transfer = new DataTransfer();
      transfer.items.add(new File(['; visual drag fixture only\n'], 'visual-drag-fixture.gcode', { type: 'text/plain' }));
      return transfer;
    }) });
    await page.waitForTimeout(180);
    const dropPrompt = page.getByText('You cannot upload files to the workspace when the connection is not established.', { exact: true });
    const visible = await dropPrompt.isVisible().catch(() => false);
    let promptDetails = null;
    if (visible) promptDetails = await dropPrompt.evaluate(el => {
      const parent = el.closest('[style*="position: fixed"]') || el.parentElement.parentElement.parentElement;
      const s = getComputedStyle(parent); const r = parent.getBoundingClientRect();
      return { text: parent.innerText.replace(/\s+/g, ' ').slice(0, 200), background: s.backgroundColor, border: s.borderColor, color: getComputedStyle(el).color, rect: { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) } };
    });
    const dropShot = visible ? await save('guide-file-drop-disconnected.png') : null;
    if (!before.background || !hovered.background || !visible) throw new Error(JSON.stringify({ before, hovered, disconnectedDropVisible: visible, promptDetails, dropRoot }));
    return { before, hovered, cardScreenshot: cardShot, disconnectedDrop: promptDetails, dropScreenshot: dropShot, syntheticDragenterOnly: true, dataTransferFile: 'visual-drag-fixture.gcode (comment-only)', noDropEvent: true };
  });

  result.completedAt = new Date().toISOString();
  result.status = result.assertions.some(item => item.status !== 'passed') ? 'partial-failures' : 'passed';
} catch (e) {
  result.fatal = redact(e.stack || e.message || e);
  result.status = 'runner-fatal';
} finally {
  await context.close().catch(() => {});
  await browser.close().catch(() => {});
  result.browserClosed = true;
  result.completedAt ||= new Date().toISOString();
  result.status ||= result.assertions.some(item => item.status !== 'passed') ? 'partial-failures' : 'passed';
  flush();
}
