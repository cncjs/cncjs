import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const playwrightModule = process.env.PLAYWRIGHT_MODULE || `${process.env.HOME}/.nvm/versions/node/v24.21.0/lib/node_modules/playwright/index.mjs`;
const { chromium } = await import(pathToFileURL(playwrightModule).href);
const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const screenshotDir = path.join(artifactDir, 'screenshots');
const progressPath = path.join(artifactDir, 'progress.json');
fs.mkdirSync(screenshotDir, { recursive: true });
const origin = process.env.V3_BASE_URL || 'http://127.0.0.1:8080';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: 'light' });
const page = await context.newPage();
page.setDefaultTimeout(10000);
page.setDefaultNavigationTimeout(30000);
const result = {
  task: 'V3-V Workspace theme matrix',
  revision: 'fce8ab51225fa6e2b36d45217b52a215f7ddeb03',
  browser: { name: 'Playwright bundled Chromium', version: browser.version(), headless: true, deviceScaleFactor: 1 },
  states: [],
  autoLive: null,
  events: { console: [], pageErrors: [], requestFailures: [], httpErrors: [] },
  status: 'in_progress'
};
function flush() {
  fs.writeFileSync(path.join(artifactDir, 'workspace-theme-matrix-progress.json'), `${JSON.stringify(result, null, 2)}\n`);
  const progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));
  progress.phase = 'Workspace theme matrix running';
  progress.evidenceCounts = {
    assertionsPassed: result.states.filter(state => state.status === 'passed').length + (result.autoLive?.status === 'passed' ? 1 : 0),
    assertionsFailed: result.states.filter(state => state.status === 'failed').length + (result.autoLive?.status === 'failed' ? 1 : 0),
    screenshots: result.states.filter(state => state.screenshot).length + (result.autoLive?.screenshots?.length || 0) + (result.targetScreenshots?.filter(item => item.screenshot).length || 0)
  };
  progress.browser = result.browser;
  progress.screenshots = result.states.filter(state => state.screenshot).map(state => state.screenshot).concat(result.autoLive?.screenshots || [], (result.targetScreenshots || []).map(item => item.screenshot).filter(Boolean));
  fs.writeFileSync(progressPath, `${JSON.stringify(progress, null, 2)}\n`);
}
function safe(value) {
  return String(value)
    .replace(/([?&]token=)[^&\s"']+/gi, '$1[redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [redacted]')
    .replace(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g, '[redacted-jwt]');
}
page.on('console', message => result.events.console.push({ type: message.type(), text: safe(message.text()).slice(0, 700) }));
page.on('pageerror', error => result.events.pageErrors.push(safe(error).slice(0, 900)));
page.on('requestfailed', request => result.events.requestFailures.push({ method: request.method(), resourceType: request.resourceType(), url: safe(request.url()).split('?')[0], error: safe(request.failure()?.errorText || '') }));
page.on('response', response => {
  if (response.status() >= 400) result.events.httpErrors.push({ status: response.status(), url: safe(response.url()).split('?')[0] });
});

async function snapshotState() {
  return page.evaluate(() => {
    const rect = element => {
      if (!element) return null;
      const r = element.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height), right: Math.round(r.right), bottom: Math.round(r.bottom) };
    };
    const parse = value => {
      const match = value.match(/rgba?\(([^)]+)\)/);
      if (match) {
        const parts = match[1].split(',').map(part => Number(part.trim()));
        return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
      }
      const srgb = value.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)$/);
      if (srgb) return { r: Number(srgb[1]) * 255, g: Number(srgb[2]) * 255, b: Number(srgb[3]) * 255, a: Number(srgb[4] ?? 1) };
      return null;
    };
    const over = (front, back) => ({ r: front.r * front.a + back.r * (1 - front.a), g: front.g * front.a + back.g * (1 - front.a), b: front.b * front.a + back.b * (1 - front.a), a: 1 });
    const luminance = color => {
      const linear = value => { const c = value / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * linear(color.r) + 0.7152 * linear(color.g) + 0.0722 * linear(color.b);
    };
    const background = element => {
      let color = { r: 255, g: 255, b: 255, a: 1 };
      const chain = [];
      for (let node = element; node; node = node.parentElement) chain.push(node);
      for (const node of chain.reverse()) {
        const parsed = parse(getComputedStyle(node).backgroundColor);
        if (parsed && parsed.a > 0) color = over(parsed, color);
      }
      return color;
    };
    const contrast = (foreground, back) => {
      const fg = over(foreground, back);
      const [lighter, darker] = [luminance(fg), luminance(back)].sort((a, b) => b - a);
      return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
    };
    const findText = label => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let textNode;
      while ((textNode = walker.nextNode())) {
        const node = textNode.parentElement;
        if (textNode.textContent.trim() === label && node?.getClientRects().length) return node;
      }
      return null;
    };
    const samples = ['Connection', 'Axes', 'Console', 'Webcam'].map(label => {
      const node = findText(label);
      if (!node) return { label, found: false };
      const style = getComputedStyle(node);
      const fg = parse(style.color);
      const bg = background(node);
      const fontSize = Number.parseFloat(style.fontSize) || 0;
      return { label, found: true, color: style.color, background: `rgb(${Math.round(bg.r)}, ${Math.round(bg.g)}, ${Math.round(bg.b)})`, contrast: fg ? contrast(fg, bg) : null, fontSizePx: fontSize };
    });
    const main = document.querySelector('main');
    const header = document.querySelector('header[aria-label="Application header"]');
    const visualizer = document.querySelector('[role="region"][aria-label="3D Visualizer widget"]');
    const canvas = visualizer?.querySelector('canvas');
    const regions = [...document.querySelectorAll('[role="region"][aria-label]')]
      .filter(node => /widget/i.test(node.getAttribute('aria-label') || ''))
      .map(node => {
        const r = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        const cssVisible = style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && r.width > 0 && r.height > 0;
        const intersectsViewport = cssVisible && r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight;
        const fullyInViewport = cssVisible && r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
        return { name: node.getAttribute('aria-label'), exists: true, cssVisible, intersectsViewport, fullyInViewport, rect: rect(node) };
      });
    const visualizerHost = document.querySelector('[aria-label="3D Visualizer"]');
    const hostRect = rect(visualizerHost);
    const primaryBorder = [...document.querySelectorAll('main button[aria-label="Hide left panel"]')][0]?.parentElement?.parentElement?.parentElement;
    const secondaryBorder = [...document.querySelectorAll('main button[aria-label="Hide right panel"]')][0]?.parentElement?.parentElement?.parentElement;
    const border = (node, side) => {
      if (!node) return null;
      const style = getComputedStyle(node);
      return { width: style[`${side}Width`], color: style[`${side}Color`], rect: rect(node) };
    };
    const bodyStyle = getComputedStyle(document.body);
    const mainStyle = main ? getComputedStyle(main) : null;
    const headerStyle = header ? getComputedStyle(header) : null;
    const targetStyleValues = [bodyStyle.color, bodyStyle.backgroundColor, mainStyle?.color, mainStyle?.backgroundColor, headerStyle?.color, headerStyle?.backgroundColor]
      .filter(Boolean);
    const rawTokenValue = targetStyleValues.some(value => /var\(|undefined|NaN/.test(value));
    const tokenNames = ['--tonic-colors-text-primary', '--tonic-colors-background-highest', '--tonic-colors-border-secondary'];
    const tokenValues = Object.fromEntries(tokenNames.map(name => [name, getComputedStyle(main || document.body).getPropertyValue(name).trim()]));
    const canvasRect = rect(canvas);
    const canvasFitsHost = Boolean(canvasRect && hostRect && canvasRect.width > 0 && canvasRect.height > 0 && canvasRect.x >= hostRect.x - 2 && canvasRect.y >= hostRect.y - 2 && canvasRect.right <= hostRect.right + 2 && canvasRect.bottom <= hostRect.bottom + 2);
    let gpu = null;
    if (canvas) {
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const extension = gl.getExtension('WEBGL_debug_renderer_info');
        gpu = {
          context: gl instanceof WebGL2RenderingContext ? 'webgl2' : 'webgl',
          vendor: extension ? gl.getParameter(extension.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
          renderer: extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
          vendorMasked: gl.getParameter(gl.VENDOR),
          rendererMasked: gl.getParameter(gl.RENDERER)
        };
      }
    }
    return {
      viewport: { width: innerWidth, height: innerHeight },
      dpr: devicePixelRatio,
      prefersDark: matchMedia('(prefers-color-scheme: dark)').matches,
      document: { scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth },
      header: rect(header), main: rect(main),
      bodyColors: { color: bodyStyle.color, background: bodyStyle.backgroundColor },
      mainColors: mainStyle ? { color: mainStyle.color, background: mainStyle.backgroundColor } : null,
      headerColors: headerStyle ? { color: headerStyle.color, background: headerStyle.backgroundColor } : null,
      tokenValues,
      computedStyleContainsRawToken: rawTokenValue,
      contrastSamples: samples,
      widgetRegions: regions,
      canvas: canvasRect ? { rect: canvasRect, drawingBuffer: { width: canvas.width, height: canvas.height }, host: hostRect, hostClientSize: visualizerHost ? { width: visualizerHost.clientWidth, height: visualizerHost.clientHeight } : null, fitsHost: canvasFitsHost, gpu } : null,
      workspaceSideBorders: { primaryRight: border(primaryBorder, 'borderRight'), secondaryLeft: border(secondaryBorder, 'borderLeft') }
    };
  });
}

async function setAppearance(choice) {
  const toggle = page.locator('header[aria-label="Application header"] button[aria-haspopup="menu"]').last();
  await toggle.click();
  await page.getByRole('menuitem', { name: /Appearance:/ }).click();
  const label = { light: 'Light theme', dark: 'Dark theme', auto: 'Use device theme' }[choice];
  await page.getByText(label, { exact: true }).last().click();
  await page.waitForTimeout(180);
}

async function captureState(mode, width) {
  const height = 900;
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ colorScheme: 'light' });
  await setAppearance(mode);
  await page.waitForTimeout(180);
  const detail = await snapshotState();
  const filename = `workspace-theme-${mode}-${width}x${height}.png`;
  const screenshot = path.join('screenshots', filename);
  await page.screenshot({ path: path.join(artifactDir, screenshot) });
  const failures = [];
  if (detail.viewport.width !== width || detail.viewport.height !== height) failures.push(`viewport measured ${detail.viewport.width}x${detail.viewport.height}`);
  if (detail.dpr !== 1) failures.push(`DPR measured ${detail.dpr}`);
  if (detail.document.overflowX) failures.push(`document scrollWidth ${detail.document.scrollWidth} exceeds ${width}`);
  for (const label of ['Connection widget', 'Axes widget', 'Console widget', 'Webcam widget', '3D Visualizer widget']) {
    if (!detail.widgetRegions.some(region => region.name === label && region.exists && region.cssVisible)) failures.push(`${label} is missing or CSS-hidden`);
  }
  if (detail.computedStyleContainsRawToken) failures.push('computed color/background contains unresolved token text');
  const missingTokens = Object.entries(detail.tokenValues).filter(([, value]) => !value).map(([name]) => name);
  if (missingTokens.length) failures.push(`semantic token values missing: ${missingTokens.join(', ')}`);
  const lowContrast = detail.contrastSamples.filter(sample => sample.found && sample.contrast !== null && sample.contrast < 4.5);
  const missingSamples = detail.contrastSamples.filter(sample => !sample.found);
  if (missingSamples.length) failures.push(`expected normal-text contrast samples missing: ${missingSamples.map(sample => sample.label).join(', ')}`);
  const unmeasuredSamples = detail.contrastSamples.filter(sample => sample.found && sample.contrast === null);
  if (unmeasuredSamples.length) failures.push(`normal-text contrast could not be computed: ${unmeasuredSamples.map(sample => sample.label).join(', ')}`);
  if (!detail.canvas || detail.canvas.drawingBuffer.width <= 0 || detail.canvas.drawingBuffer.height <= 0 || detail.canvas.rect.width <= 0 || detail.canvas.rect.height <= 0) failures.push('Visualizer canvas has no positive drawing buffer and on-screen geometry');
  if (detail.canvas && !detail.canvas.fitsHost) failures.push(`Visualizer canvas does not fit its host: ${JSON.stringify({ canvas: detail.canvas.rect, host: detail.canvas.host, hostClientSize: detail.canvas.hostClientSize })}`);
  for (const [side, border] of Object.entries(detail.workspaceSideBorders)) {
    if (!border || Number.parseFloat(border.width) <= 0 || /transparent|rgba\([^)]*,\s*0\s*\)/.test(border.color)) failures.push(`${side} workspace separator is missing or transparent: ${JSON.stringify(border)}`);
  }
  if (lowContrast.length) failures.push(`normal text contrast below 4.5:1: ${JSON.stringify(lowContrast)}`);
  const record = { mode, viewport: `${width}x${height}`, screenshot, detail, status: failures.length ? 'failed' : 'passed', failures };
  result.states.push(record);
  flush();
  return record;
}

try {
  await page.goto(`${origin}/#/workspace`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.getByRole('region', { name: 'Connection widget', exact: true }).waitFor({ state: 'visible', timeout: 30000 });
  await page.getByRole('region', { name: '3D Visualizer widget', exact: true }).waitFor({ state: 'visible', timeout: 30000 });
  const initialCanvas = page.locator('[role="region"][aria-label="3D Visualizer widget"] canvas').first();
  await initialCanvas.waitFor({ state: 'attached', timeout: 30000 });
  await page.waitForFunction(node => node.width > 0 && node.height > 0, await initialCanvas.elementHandle(), { timeout: 30000 });
  result.browser.userAgent = await page.evaluate(() => navigator.userAgent);
  result.browser.platform = await page.evaluate(() => navigator.platform);
  result.browser.headless = true;
  flush();

  for (const width of [1440, 768]) {
    for (const mode of ['light', 'dark', 'auto']) {
      try {
        await captureState(mode, width);
      } catch (error) {
        result.states.push({ mode, viewport: `${width}x900`, status: 'failed', failures: [safe(error).slice(0, 1200)] });
        flush();
      }
    }
  }

  try {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ colorScheme: 'light' });
    await setAppearance('auto');
    const light = await snapshotState();
    const liveScreenshots = [];
    const shotLight = path.join('screenshots', 'workspace-auto-live-light-1440x900.png');
    await page.screenshot({ path: path.join(artifactDir, shotLight) });
    liveScreenshots.push(shotLight);
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForFunction(() => matchMedia('(prefers-color-scheme: dark)').matches, null, { timeout: 5000 });
    await page.waitForTimeout(200);
    const dark = await snapshotState();
    const shotDark = path.join('screenshots', 'workspace-auto-live-dark-1440x900.png');
    await page.screenshot({ path: path.join(artifactDir, shotDark) });
    liveScreenshots.push(shotDark);
    await page.emulateMedia({ colorScheme: 'light' });
    await page.waitForFunction(() => !matchMedia('(prefers-color-scheme: dark)').matches, null, { timeout: 5000 });
    await page.waitForTimeout(200);
    const restored = await snapshotState();
    const shotRestored = path.join('screenshots', 'workspace-auto-live-restored-light-1440x900.png');
    await page.screenshot({ path: path.join(artifactDir, shotRestored) });
    liveScreenshots.push(shotRestored);
    const colorChanged = JSON.stringify(light.mainColors) !== JSON.stringify(dark.mainColors);
    const colorRestored = JSON.stringify(light.mainColors) === JSON.stringify(restored.mainColors);
    const failures = [];
    if (!dark.prefersDark || !colorChanged) failures.push('auto appearance did not change computed workspace colors when OS preference switched to dark');
    if (restored.prefersDark || !colorRestored) failures.push('auto appearance did not restore light colors when OS preference switched back');
    result.autoLive = { status: failures.length ? 'failed' : 'passed', sequence: ['light', 'dark', 'light'], light, dark, restored, screenshots: liveScreenshots, failures };
  } catch (error) {
    result.autoLive = { status: 'failed', error: safe(error).slice(0, 1200), failures: [safe(error).slice(0, 1200)] };
  }
  try {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ colorScheme: 'light' });
    await setAppearance('light');
    const offscreenRegions = await page.evaluate(() => [...document.querySelectorAll('[role="region"][aria-label]')]
      .filter(node => /widget/i.test(node.getAttribute('aria-label') || ''))
      .map(node => {
        const r = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        const cssVisible = style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && r.width > 0 && r.height > 0;
        const fullyInViewport = cssVisible && r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
        return { name: node.getAttribute('aria-label'), cssVisible, fullyInViewport };
      }).filter(region => region.cssVisible && !region.fullyInViewport).map(region => region.name));
    result.targetScreenshots = [];
    for (const name of offscreenRegions) {
      const region = page.getByRole('region', { name, exact: true });
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const screenshot = path.join('screenshots', `workspace-widget-target-${slug}-1440x900.png`);
      try {
        await region.scrollIntoViewIfNeeded({ timeout: 10000 });
        await page.waitForTimeout(100);
        const detail = await region.evaluate(node => {
          const r = node.getBoundingClientRect();
          return { viewport: { width: innerWidth, height: innerHeight }, rect: { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height), right: Math.round(r.right), bottom: Math.round(r.bottom) }, intersectsViewport: r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight, fullyInViewport: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, textExcerpt: node.innerText.replace(/\\s+/g, ' ').slice(0, 180) };
        });
        await page.screenshot({ path: path.join(artifactDir, screenshot) });
        result.targetScreenshots.push({ name, screenshot, status: detail.intersectsViewport ? 'passed' : 'failed', detail });
      } catch (error) {
        result.targetScreenshots.push({ name, screenshot: null, status: 'failed', error: safe(error).slice(0, 800) });
      }
      flush();
    }
  } catch (error) {
    result.targetScreenshots = [{ status: 'failed', error: safe(error).slice(0, 1000) }];
  }
  flush();
} catch (error) {
  result.startupError = safe(error).slice(0, 1500);
} finally {
  result.status = result.states.length === 6 && result.states.every(state => state.status === 'passed') && result.autoLive?.status === 'passed' && (result.targetScreenshots || []).every(item => item.status === 'passed') ? 'passed' : 'failed';
  result.completedAt = new Date().toISOString();
  fs.writeFileSync(path.join(artifactDir, 'workspace-theme-matrix-v3.json'), `${JSON.stringify(result, null, 2)}\n`);
  const progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));
  progress.phase = 'Workspace theme matrix completed; supplemental route and semantic checks pending';
  progress.evidenceCounts = {
    assertionsPassed: result.states.filter(state => state.status === 'passed').length + (result.autoLive?.status === 'passed' ? 1 : 0),
    assertionsFailed: result.states.filter(state => state.status === 'failed').length + (result.autoLive?.status === 'failed' ? 1 : 0),
    screenshots: result.states.filter(state => state.screenshot).length + (result.autoLive?.screenshots?.length || 0) + (result.targetScreenshots?.filter(item => item.screenshot).length || 0)
  };
  progress.browser = result.browser;
  progress.matrix = 'workspace-theme-matrix-v3.json';
  progress.screenshots = result.states.filter(state => state.screenshot).map(state => state.screenshot).concat(result.autoLive?.screenshots || [], (result.targetScreenshots || []).map(item => item.screenshot).filter(Boolean));
  fs.writeFileSync(progressPath, `${JSON.stringify(progress, null, 2)}\n`);
  await browser.close();
}
console.log(JSON.stringify({ status: result.status, stateCount: result.states.length, states: result.states.map(({ mode, viewport, status, failures }) => ({ mode, viewport, status, failures })), autoLive: result.autoLive && { status: result.autoLive.status, failures: result.autoLive.failures }, eventCounts: Object.fromEntries(Object.entries(result.events).map(([name, value]) => [name, value.length])) }, null, 2));
if (result.status !== 'passed') process.exitCode = 1;
