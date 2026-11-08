import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const playwrightModule = process.env.PLAYWRIGHT_MODULE || '/tmp/cncjs-r6-playwright/node_modules/playwright/index.mjs';
const { chromium } = await import(pathToFileURL(playwrightModule).href);
const artifactDir = path.dirname(new URL(import.meta.url).pathname);
const fixturePath = '/tmp/cncjs-r6-20261001/pivot-rectangle.gcode';
const fixture = [
  'G21', 'G90',
  'G0 X10 Y20 Z-2',
  'G1 X50 Y20 Z-2 F100',
  'G1 X50 Y60 Z0',
  'G1 X10 Y60 Z0',
  'G1 X10 Y20 Z-2',
].join('\n') + '\n';
fs.writeFileSync(fixturePath, fixture, 'ascii');

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  storageState: process.env.R6_STORAGE_STATE,
});
await context.addInitScript(() => {
  const originalError = console.error;
  window.__r6ConsoleErrorStacks = [];
  console.error = function captureR6ConsoleError(...args) {
    if (String(args[0]).includes('THREE.DirectGeometry: Faceless')) {
      window.__r6ConsoleErrorStacks.push(new Error('Faceless geometry console call').stack);
    }
    return originalError.apply(this, args);
  };
});
const page = await context.newPage();
page.setDefaultTimeout(12000);
const runId = Date.now();
const profileA = `R6 pivot A ${runId}`;
const profileB = `R6 pivot B ${runId}`;
const limitsA = { xmin: 0, xmax: 200, ymin: -100, ymax: 100, zmin: -50, zmax: 50 };
const limitsB = { xmin: -100, xmax: 0, ymin: 50, ymax: 100, zmin: -50, zmax: 50 };
const result = {
  browser: { name: 'Playwright bundled Chromium', version: browser.version(), viewport: '1440x900', dpr: 1, headless: true, viewportChangesDuringWorkspaceEntry: 0 },
  fixture: { path: fixturePath, bytes: Buffer.byteLength(fixture), expectedLines: 7, sha256: null, knownBounds: { min: { x: 10, y: 20, z: -2 }, max: { x: 50, y: 60, z: 0 }, center: { x: 30, y: 40, z: -1 } } },
  profiles: { profileA, limitsA, profileB, limitsB, cleanedUp: false },
  gates: [],
  cncUnitCommands: [],
  cncCommandEventCount: 0,
  cncCommandNames: [],
  cncCommandDetails: [],
  cncOperationCounts: { read: 0, programState: 0, setup: 0, motion: 0, other: 0 },
  consoleIssues: [],
  pageErrors: [],
  requestFailures: [],
};
const outputPath = path.join(artifactDir, 'visualizer-functional-r6-verified12.json');
const flush = () => fs.writeFileSync(outputPath, JSON.stringify(result, null, 2) + '\n');
const operationSnapshot = () => ({ ...result.cncOperationCounts });
const operationDelta = before => Object.fromEntries(
  Object.keys(before).map(category => [category, result.cncOperationCounts[category] - before[category]])
);
function assertNoCncMutation(before, label) {
  const delta = operationDelta(before);
  const mutationDelta = Object.fromEntries(Object.entries(delta).filter(([category]) => category !== 'read'));
  if (Object.values(mutationDelta).some(count => count !== 0)) {
    throw new Error(`${label} emitted unexpected CNC commands: ${JSON.stringify(mutationDelta)}`);
  }
  return { cncCommandDelta: delta };
}
const decodeSocketPayload = (payload = '') => {
  const packets = [];
  let cursor = 0;
  while (cursor < payload.length) {
    const colon = payload.indexOf(':', cursor);
    if (colon > cursor && /^\d+$/.test(payload.slice(cursor, colon))) {
      const length = Number(payload.slice(cursor, colon));
      const start = colon + 1;
      const packet = payload.slice(start, start + length);
      if (packet.length !== length) break;
      packets.push(packet);
      cursor = start + length;
    } else {
      const separator = payload.indexOf('\x1e', cursor);
      packets.push(payload.slice(cursor, separator < 0 ? payload.length : separator));
      if (separator < 0) break;
      cursor = separator + 1;
    }
  }
  return packets;
};
let websocketTransportActive = false;
function recordSocketPacket(packet, transport) {
  const match = packet.match(/^42\d*(\[.*\])$/s);
  if (!match) return;
  try {
    const [event, ...args] = JSON.parse(match[1]);
    if (event !== 'command') return;
    const commandName = typeof args[1] === 'string' ? args[1].slice(0, 48) : `type:${typeof args[1]}`;
    const gcode = commandName === 'gcode' && typeof args[2] === 'string' ? args[2].trim() : '';
    const gcodeName = gcode ? gcode.split(/\s+/, 1)[0].slice(0, 24).toUpperCase() : '';
    const readOnlyGcode = commandName === 'gcode' && ['?', '$G', '$#', '$$', '$I', '$N'].includes(gcode.toUpperCase());
    const programStateNames = new Set(['gcode:load', 'gcode:unload', 'watchdir:load', 'sender_load', 'sender_unload']);
    const category = readOnlyGcode || commandName === 'autolevel:getProbeState'
      ? 'read'
      : programStateNames.has(commandName)
        ? 'programState'
        : commandName === 'gcode' && ['G20', 'G21', 'G54', 'G55', 'G56', 'G57', 'G58', 'G59', 'G90', 'G91'].includes(gcodeName)
          ? 'setup'
          : commandName === 'gcode'
            ? 'motion'
            : 'other';
    result.cncCommandEventCount += 1;
    result.cncCommandNames.push(commandName);
    result.cncOperationCounts[category] += 1;
    result.cncCommandDetails.push({ name: commandName, category, code: category === 'setup' ? gcodeName : undefined, transport });
    if (commandName === 'gcode' && (gcodeName === 'G20' || gcodeName === 'G21')) result.cncUnitCommands.push(gcodeName);
  } catch (_) { /* Other Socket.IO packets are not relevant to this gate. */ }
}
page.on('request', request => {
  if (websocketTransportActive || request.method() !== 'POST' || !request.url().includes('/socket.io/')) return;
  for (const packet of decodeSocketPayload(request.postData() || '')) recordSocketPacket(packet, 'polling');
});
page.on('websocket', socket => {
  socket.on('framesent', frame => {
    websocketTransportActive = true;
    if (typeof frame.payload === 'string') recordSocketPacket(frame.payload, 'websocket');
  });
});
page.on('console', message => {
  if (['error', 'warning'].includes(message.type())) {
    const location = message.location();
    result.consoleIssues.push({
      type: message.type(),
      text: message.text().slice(0, 2400),
      location: { url: location.url.split('/').slice(-4).join('/'), lineNumber: location.lineNumber, columnNumber: location.columnNumber },
    });
  }
});
page.on('pageerror', error => result.pageErrors.push(String(error).slice(0, 700)));
page.on('requestfailed', request => result.requestFailures.push({ method: request.method(), resourceType: request.resourceType(), error: request.failure()?.errorText }));

async function gate(name, action) {
  const startedAt = Date.now();
  try {
    const detail = await action();
    result.gates.push({ name, status: 'passed', durationMs: Date.now() - startedAt, ...(detail || {}) });
  } catch (error) {
    result.gates.push({ name, status: 'failed', durationMs: Date.now() - startedAt, error: String(error).slice(0, 900) });
    await page.screenshot({ path: path.join(artifactDir, `visualizer-functional-failure-${name}.png`), fullPage: true }).catch(() => {});
  }
  flush();
}

async function fillLimits(limits) {
  const labels = { xmin: 'X min', xmax: 'X max', ymin: 'Y min', ymax: 'Y max', zmin: 'Z min', zmax: 'Z max' };
  for (const [key, value] of Object.entries(limits)) {
    await page.getByLabel(new RegExp(`^${labels[key]}`)).fill(String(value));
  }
}

async function createProfile(name, limits) {
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByText('New Machine', { exact: true }).waitFor();
  await page.getByLabel(/^Machine name:/).fill(name);
  await fillLimits(limits);
  await page.getByRole('button', { name: 'Add', exact: true }).last().click();
  await page.getByRole('button', { name, exact: true }).waitFor();
}

async function connectSimulator() {
  const connection = page.getByRole('region', { name: 'Connection widget', exact: true });
  const close = connection.getByRole('button', { name: 'Close', exact: true });
  if (await close.isVisible().catch(() => false)) return { alreadyConnected: true };
  const auto = connection.getByRole('checkbox', { name: 'Connect automatically', exact: true });
  if (await auto.isChecked().catch(() => false)) await connection.getByText('Connect automatically', { exact: true }).click();
  const grbl = connection.getByRole('button', { name: 'Grbl', exact: true });
  if (await grbl.getAttribute('data-selected') === null) await grbl.click();
  const port = connection.getByRole('button', { name: 'Serial port', exact: true });
  await port.click();
  const option = page.getByRole('menuitem', { name: /\/tmp\/ttyGRBL/ });
  await option.waitFor({ state: 'visible', timeout: 45000 });
  const selectedPort = (await option.innerText()).trim();
  await option.click();
  const open = connection.getByRole('button', { name: 'Open', exact: true });
  await open.waitFor({ state: 'visible' });
  if (!(await open.isEnabled())) throw new Error('Simulator Open button is disabled');
  await open.click();
  await close.waitFor({ state: 'visible', timeout: 20000 });
  return { alreadyConnected: false, selectedPort, connected: true };
}

async function engine() {
  return page.evaluate(() => window.__CNCJS_VISUALIZER_METRICS__?.engines?.[0] || null);
}

async function readWebGLRenderer(canvas) {
  return canvas.evaluate(element => {
    const context = element.getContext('webgl2') || element.getContext('webgl');
    if (!context) return null;
    const extension = context.getExtension('WEBGL_debug_renderer_info');
    if (!extension) return { masked: true };
    return {
      vendor: context.getParameter(extension.UNMASKED_VENDOR_WEBGL),
      renderer: context.getParameter(extension.UNMASKED_RENDERER_WEBGL),
    };
  });
}

async function waitForEngine(predicate, description, timeoutMs = 12000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const value = await engine();
    if (value && predicate(value)) return value;
    await page.waitForTimeout(50);
  }
  throw new Error(`Timed out waiting for engine ${description}; last state: ${JSON.stringify(await engine())}`);
}

async function assertPivot(name, expected) {
  const state = await waitForEngine(value => ['x', 'y', 'z'].every(axis => Math.abs(value[`pivot${axis.toUpperCase()}`] - expected[axis]) <= 1e-6), `pivot ${JSON.stringify(expected)}`);
  const actual = { x: state.pivotX, y: state.pivotY, z: state.pivotZ };
  result.gates.push({ name, status: 'passed', actual, expected });
  flush();
}

async function selectProfile(name) {
  const button = page.getByRole('button', { name: 'Select machine profile', exact: true });
  await button.click();
  await page.getByRole('menuitem', { name, exact: true }).click();
  const selectedLabel = name === 'None' ? 'No machine profile selected' : name;
  await button.getByText(selectedLabel, { exact: true }).waitFor({ state: 'visible' });
}

async function loadFixture(visualizer) {
  const before = await engine();
  const upload = visualizer.getByRole('button', { name: 'Upload G-code', exact: true });
  if (!(await upload.isEnabled())) throw new Error('G-code upload is disabled');
  const chooserPromise = page.waitForEvent('filechooser', { timeout: 2500 }).catch(() => null);
  await upload.click();
  const chooser = await chooserPromise;
  if (chooser) await chooser.setFiles(fixturePath);
  else await visualizer.locator('input[type="file"]').first().setInputFiles(fixturePath);
  await waitForEngine(value => value.hasGCode && value.renderFrameCount > before.renderFrameCount, 'loaded G-code render');
}

async function setViewToggle(menuLabel, metricKey, expected) {
  const visualizer = page.getByRole('region', { name: '3D Visualizer widget', exact: true });
  await visualizer.getByRole('button', { name: '3D View options', exact: true }).click();
  const menuItem = visualizer.getByRole('menuitem', { name: menuLabel, exact: true });
  const itemState = await menuItem.evaluate(node => ({
    tagName: node.tagName,
    disabled: Boolean(node.disabled),
    ariaDisabled: node.getAttribute('aria-disabled'),
    pointerEvents: getComputedStyle(node).pointerEvents,
    text: node.textContent.trim(),
    rect: (() => { const { x, y, width, height } = node.getBoundingClientRect(); return { x, y, width, height }; })(),
  }));
  await menuItem.click();
  try {
    return await waitForEngine(value => value[metricKey] === expected, `${metricKey}=${expected}`);
  } catch (error) {
    const immediate = await engine();
    throw new Error(`View-toggle menu action did not update state: ${JSON.stringify({ menuLabel, metricKey, expected, actual: immediate && immediate[metricKey], itemState, waitError: String(error).slice(0, 240)})}`);
  }
}

try {
  const fixtureHash = await import('node:crypto').then(({ createHash }) => createHash('sha256').update(fixture).digest('hex'));
  result.fixture.sha256 = fixtureHash;

  await gate('create-two-synthetic-machine-profiles', async () => {
    await page.goto('http://127.0.0.1:8080/#/administration/machine-profiles', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Add', exact: true }).waitFor({ timeout: 30000 });
    await createProfile(profileA, limitsA);
    await createProfile(profileB, limitsB);
    return { profileA, limitsA, profileB, limitsB };
  });

  await gate('connect-simulator-and-select-profile-a', async () => {
    const adminHiddenState = await waitForEngine(value => value.height === 0, 'hidden Admin Visualizer engine');
    await page.screenshot({ path: path.join(artifactDir, 'visualizer-functional-admin-hidden-r6.png'), fullPage: true });
    const workspaceLink = page.locator('nav a').filter({ hasText: 'Workspace' }).first();
    await workspaceLink.waitFor({ state: 'visible' });
    await workspaceLink.click();
    await page.waitForFunction(() => window.location.hash === '#/workspace');
    const visualizer = page.getByRole('region', { name: '3D Visualizer widget', exact: true });
    const persistedEngine = await waitForEngine(value => value.width > 100 && value.height > 100, 'route-visible canvas dimensions', 15000);
    if (persistedEngine.hasGCode) {
      await visualizer.getByRole('button', { name: 'Close G-code file', exact: true }).click();
      await waitForEngine(value => !value.hasGCode, 'unload persisted G-code fixture');
    }
    const connection = await connectSimulator();
    const state = await waitForEngine(value => value.width > 100 && value.height > 100, 'route-visible canvas dimensions', 15000);
    const canvas = visualizer.locator('canvas').first();
    await canvas.waitFor({ state: 'visible', timeout: 15000 });
    const canvasBounds = await canvas.evaluate(element => {
      const { x, y, width, height } = element.getBoundingClientRect();
      return { x, y, width, height };
    });
    const graphics = await readWebGLRenderer(canvas);
    if (!graphics) throw new Error('The visible Visualizer canvas has no real WebGL context');
    const threeDButton = visualizer.getByRole('button', { name: '3D View', exact: true }).first();
    const threeDTitle = await threeDButton.getAttribute('title');
    if (threeDTitle !== 'Disable 3D View') throw new Error(`3D View was not active after route reveal (title=${threeDTitle})`);
    result.browser.webgl = graphics;
    await page.screenshot({ path: path.join(artifactDir, 'visualizer-functional-workspace-visible-r6.png'), fullPage: true });
    const activeState = await engine();
    if (activeState.hasGCode) {
      await visualizer.getByRole('button', { name: 'Close G-code file', exact: true }).click();
      await waitForEngine(value => !value.hasGCode, 'clear persisted G-code before profile pivot checks');
    }
    await selectProfile('None');
    await assertPivot('pivot-clear-profile-no-gcode', { x: 0, y: 0, z: 0 });
    await selectProfile(profileA);
    await assertPivot('pivot-profile-a-no-gcode', { x: 100, y: 0, z: 0 });
    return { ...connection, adminHiddenState, engine: state, canvasBounds, graphics, threeDTitle, viewportUnchanged: true };
  });

  const visualizer = page.getByRole('region', { name: '3D Visualizer widget', exact: true });
  await gate('pivot-gcode-and-profile-transition-six-scenarios', async () => {
    const commandsBefore = operationSnapshot();
    const assertWorldCenter = (state, label) => {
      const center = { x: state.gcodeWorldCenterX, y: state.gcodeWorldCenterY, z: state.gcodeWorldCenterZ };
      if (['x', 'y', 'z'].some(axis => !Number.isFinite(center[axis]) || Math.abs(center[axis]) > 1e-6)) {
        throw new Error(`${label} world mesh center differs from origin: ${JSON.stringify(center)}`);
      }
      return center;
    };
    await loadFixture(visualizer);
    const engineWithGcodeA = await waitForEngine(value => value.hasGCode, 'G-code loaded');
    const centeredAfterLoad = assertWorldCenter(engineWithGcodeA, 'Loaded G-code');
    const loadedPivot = { x: engineWithGcodeA.pivotX, y: engineWithGcodeA.pivotY, z: engineWithGcodeA.pivotZ };
    if (JSON.stringify(loadedPivot) !== JSON.stringify({ x: 30, y: 40, z: -1 })) throw new Error(`G-code center pivot differs: ${JSON.stringify(loadedPivot)}`);
    await selectProfile(profileB);
    const loadedPivotWithB = await waitForEngine(value => value.hasGCode, 'profile B with G-code');
    await waitForEngine(value => value.hasGCode && ['x', 'y', 'z'].every(axis => Math.abs(value[`gcodeWorldCenter${axis.toUpperCase()}`]) <= 1e-6), 'world mesh center after profile change');
    const centeredAfterProfileChange = assertWorldCenter(loadedPivotWithB, 'Loaded G-code after profile change');
    const preservedPivot = { x: loadedPivotWithB.pivotX, y: loadedPivotWithB.pivotY, z: loadedPivotWithB.pivotZ };
    if (JSON.stringify(preservedPivot) !== JSON.stringify({ x: 30, y: 40, z: -1 })) throw new Error(`Profile change moved loaded G-code pivot: ${JSON.stringify(preservedPivot)}`);
    await page.getByRole('button', { name: 'Close G-code file', exact: true }).click();
    const unloaded = await waitForEngine(value => !value.hasGCode, 'G-code unloaded');
    if (unloaded.gcodeWorldCenterX !== null || unloaded.gcodeWorldCenterY !== null || unloaded.gcodeWorldCenterZ !== null) {
      throw new Error(`G-code world center was retained after removal: ${JSON.stringify({ x: unloaded.gcodeWorldCenterX, y: unloaded.gcodeWorldCenterY, z: unloaded.gcodeWorldCenterZ })}`);
    }
    await assertPivot('pivot-profile-b-after-unload', { x: -50, y: 75, z: 0 });
    await selectProfile('None');
    await assertPivot('pivot-no-profile-no-gcode', { x: 0, y: 0, z: 0 });
    await loadFixture(visualizer);
    const noProfileLoaded = await waitForEngine(value => value.hasGCode, 'G-code loaded without profile');
    assertWorldCenter(noProfileLoaded, 'Loaded G-code without profile');
    await assertPivot('pivot-gcode-without-profile', { x: 30, y: 40, z: -1 });
    await page.screenshot({ path: path.join(artifactDir, 'visualizer-pivot-six-final.png'), fullPage: true });
    const commandDelta = operationDelta(commandsBefore);
    if (commandDelta.motion !== 0 || commandDelta.setup !== 0 || commandDelta.other !== 0) throw new Error(`G-code preview/profile/pivot actions emitted unexpected commands: ${JSON.stringify(commandDelta)}`);
    return { scenariosCovered: 6, profileChangeWhileLoadedPreservedGcodeCenter: true, worldMeshCenterAfterLoad: centeredAfterLoad, worldMeshCenterAfterProfileChange: centeredAfterProfileChange, gcodeBounds: result.fixture.knownBounds, cncCommandDelta: commandDelta };
  });

  await gate('coordinate-system-setting-with-no-profile', async () => {
    const before = await engine();
    const commandsBefore = operationSnapshot();
    const initial = { setting: before.coordinateSystemVisible, actualSceneObject: before.sceneCoordinateSystemVisible };
    const label = before.coordinateSystemVisible ? 'Hide Coordinate System' : 'Show Coordinate System';
    await setViewToggle(label, 'coordinateSystemVisible', !before.coordinateSystemVisible);
    const changed = await engine();
    const after = { setting: changed.coordinateSystemVisible, actualSceneObject: changed.sceneCoordinateSystemVisible };
    if (after.setting !== !initial.setting) throw new Error(`No-profile visibility setting did not change: ${JSON.stringify({ initial, after })}`);
    await setViewToggle(after.setting ? 'Hide Coordinate System' : 'Show Coordinate System', 'coordinateSystemVisible', initial.setting);
    const restored = await engine();
    const commandDelta = assertNoCncMutation(commandsBefore, 'No-profile coordinate-system setting');
    return { profile: 'None', initial, changed: after, restored: { setting: restored.coordinateSystemVisible, actualSceneObject: restored.sceneCoordinateSystemVisible }, ...commandDelta };
  });

  await gate('camera-positions-zoom-and-projection', async () => {
    const commandsBefore = operationSnapshot();
    const viewButtons = [
      ['3D View', '3d', [200, -200, 200]],
      ['Top View', 'top', [0, 0, 200]],
      ['Front View', 'front', [0, -200, 0]],
      ['Left Side View', 'left', [200, 0, 0]],
      ['Right Side View', 'right', [-200, 0, 0]],
    ];
    const cameraResults = [];
    for (const [label, expected, position] of viewButtons) {
      const button = visualizer.getByRole('button', { name: label, exact: true }).last();
      await button.click();
      const state = await waitForEngine(value => value.cameraPosition === expected &&
        ['cameraX', 'cameraY', 'cameraZ'].every((key, index) => Math.abs(value[key] - position[index]) <= 1e-6), `actual camera position ${expected}`);
      cameraResults.push({ label, cameraPosition: state.cameraPosition, actualPosition: { x: state.cameraX, y: state.cameraY, z: state.cameraZ }, rotation: { x: state.cameraRotationX, y: state.cameraRotationY, z: state.cameraRotationZ } });
    }
    let beforeZoom = await engine();
    await visualizer.getByRole('button', { name: 'Zoom In', exact: true }).click();
    const zoomedIn = await waitForEngine(value => value.cameraDistance < beforeZoom.cameraDistance - 1e-6 || value.cameraZoom > beforeZoom.cameraZoom + 1e-6, 'actual Zoom In camera change');
    cameraResults.push({ label: 'Zoom In', distance: zoomedIn.cameraDistance, zoom: zoomedIn.cameraZoom });
    beforeZoom = await engine();
    await visualizer.getByRole('button', { name: 'Zoom Out', exact: true }).click();
    const zoomedOut = await waitForEngine(value => value.cameraDistance > beforeZoom.cameraDistance + 1e-6 || value.cameraZoom < beforeZoom.cameraZoom - 1e-6, 'actual Zoom Out camera change');
    cameraResults.push({ label: 'Zoom Out', distance: zoomedOut.cameraDistance, zoom: zoomedOut.cameraZoom });
    const beforeFit = await engine();
    await visualizer.getByRole('button', { name: 'Zoom to Fit', exact: true }).click();
    const fitted = await waitForEngine(value => Math.abs(value.cameraFov - beforeFit.cameraFov) > 1e-6 || Math.abs(value.cameraZoom - beforeFit.cameraZoom) > 1e-6, 'actual Zoom to Fit projection change');
    cameraResults.push({ label: 'Zoom to Fit', fov: fitted.cameraFov, zoom: fitted.cameraZoom });
    await visualizer.getByRole('button', { name: '3D View options', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Orthographic Projection', exact: true }).click();
    const orthographic = await waitForEngine(value => value.projection === 'orthographic' && value.projectionModeOrthographic === true, 'actual orthographic projection');
    await visualizer.getByRole('button', { name: '3D View options', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Perspective Projection', exact: true }).click();
    const perspective = await waitForEngine(value => value.projection === 'perspective' && value.projectionModeOrthographic === false, 'actual perspective projection');
    const commandDelta = assertNoCncMutation(commandsBefore, 'Camera and zoom actions');
    return { cameraResults, projections: [{ type: 'orthographic', actual: orthographic.projectionModeOrthographic }, { type: 'perspective', actual: perspective.projectionModeOrthographic }], ...commandDelta };
  });

  await gate('limits-grid-coordinate-system-and-tool-toggles', async () => {
    await selectProfile(profileA);
    await assertPivot('pivot-profile-a-with-gcode-before-view-toggles', { x: 30, y: 40, z: -1 });
    const commandsBefore = operationSnapshot();
    const toggleResults = [];
    for (const [key, sceneKey, hideLabel, showLabel] of [
      ['limitsVisible', 'sceneLimitsVisible', 'Hide Limits', 'Show Limits'],
      ['coordinateSystemVisible', 'sceneCoordinateSystemVisible', 'Hide Coordinate System', 'Show Coordinate System'],
      ['gridLineNumbersVisible', 'sceneGridLineNumbersVisible', 'Hide Grid Line Numbers', 'Show Grid Line Numbers'],
      ['cuttingToolVisible', 'sceneCuttingToolVisible', 'Hide Cutting Tool', 'Show Cutting Tool'],
    ]) {
      const before = await engine();
      const afterHide = await setViewToggle(before[key] ? hideLabel : showLabel, key, !before[key]);
      const sceneAfterHide = await waitForEngine(value => value[sceneKey] === !before[key], `${sceneKey} changed in scene`);
      const afterRestore = await setViewToggle(afterHide[key] ? hideLabel : showLabel, key, before[key]);
      const sceneAfterRestore = await waitForEngine(value => value[sceneKey] === before[key], `${sceneKey} restored in scene`);
      toggleResults.push({ metric: key, initial: before[key], hiddenOrShown: afterHide[key], actualSceneAfterHide: sceneAfterHide[sceneKey], restored: afterRestore[key], actualSceneAfterRestore: sceneAfterRestore[sceneKey] });
    }
    const commandDelta = assertNoCncMutation(commandsBefore, 'Visualizer visibility toggles');
    return { toggles: toggleResults, ...commandDelta };
  });

  await gate('controller-driven-visualizer-unit-changes', async () => {
    const axes = page.getByRole('region', { name: 'Axes widget', exact: true });
    const currentButton = axes.getByRole('button', { name: /G21 \(mm\)|G20 \(inch\)/ }).first();
    await currentButton.click();
    await page.getByRole('menuitem', { name: 'G20 (inch)', exact: true }).click();
    const imperial = await waitForEngine(value => value.units === 'in', 'imperial units', 15000);
    const imperialCommandFound = result.cncUnitCommands.includes('G20');
    await axes.getByRole('button', { name: /G21 \(mm\)|G20 \(inch\)/ }).first().click();
    await page.getByRole('menuitem', { name: 'G21 (mm)', exact: true }).click();
    const metric = await waitForEngine(value => value.units === 'mm', 'metric units', 15000);
    const metricCommandFound = result.cncUnitCommands.includes('G21');
    if (!imperialCommandFound || !metricCommandFound) throw new Error(`Expected actual G20/G21 simulator commands; captured ${JSON.stringify(result.cncUnitCommands)}`);
    return { imperialUnits: imperial.units, metricUnits: metric.units, commands: result.cncUnitCommands };
  });

  await gate('probe-area-ui-entry', async () => {
    const commandsBeforePreparation = operationSnapshot();
    const loaded = await engine();
    if (loaded && loaded.hasGCode) {
      await visualizer.getByRole('button', { name: 'Close G-code file', exact: true }).click();
      await waitForEngine(value => !value.hasGCode, 'unload G-code before probe area setup');
    }
    const preparationCommandDelta = operationDelta(commandsBeforePreparation);
    const commandsBefore = operationSnapshot();
    await visualizer.getByRole('button', { name: 'Zoom to Fit', exact: true }).click();
    await visualizer.getByRole('button', { name: 'Top View', exact: true }).click();
    await waitForEngine(value => value.cameraPosition === 'top' && Math.abs(value.cameraX) <= 1e-6 && Math.abs(value.cameraY) <= 1e-6, 'top camera before probe drag');
    await visualizer.getByRole('button', { name: '3D View options', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Orthographic Projection', exact: true }).click();
    await waitForEngine(value => value.projectionModeOrthographic === true, 'orthographic probe canvas');
    const autolevel = page.getByRole('region', { name: /Autolevel Widget/i });
    const startButton = autolevel.getByRole('button', { name: 'Start New Probe', exact: true });
    await startButton.scrollIntoViewIfNeeded();
    await startButton.click();
    await autolevel.getByLabel('Start X', { exact: true }).waitFor({ state: 'visible' });
    const values = {};
    for (const label of ['Start X', 'Start Y', 'End X', 'End Y']) {
      values[label] = await autolevel.getByLabel(label, { exact: true }).inputValue();
    }
    const canvas = visualizer.locator('canvas').first();
    const bounds = await canvas.boundingBox();
    await page.screenshot({ path: path.join(artifactDir, 'visualizer-probe-area-before-drag-r6.png'), fullPage: true });
    const candidates = [
      { x: 0.60, y: 0.40 },
      { x: 0.62, y: 0.37 },
      { x: 0.64, y: 0.42 },
      { x: 0.58, y: 0.35 },
      { x: 0.66, y: 0.45 },
    ];
    let start = null;
    let end = null;
    let eventTarget = null;
    let changed = [];
    const startValues = { ...values };
    for (const candidate of candidates) {
      start = { x: bounds.x + bounds.width * candidate.x, y: bounds.y + bounds.height * candidate.y };
      end = { x: start.x + Math.min(30, bounds.width * 0.06), y: start.y - Math.min(26, bounds.height * 0.055) };
      eventTarget = await page.evaluate(({ x, y }) => {
        const target = document.elementFromPoint(x, y);
        return target ? { tag: target.tagName, isCanvas: target.tagName === 'CANVAS' } : null;
      }, start);
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      await page.mouse.move(end.x, end.y, { steps: 6 });
      await page.mouse.up();
      await page.waitForTimeout(150);
      for (const label of ['Start X', 'Start Y', 'End X', 'End Y']) values[label] = await autolevel.getByLabel(label, { exact: true }).inputValue();
      changed = Object.keys(values).filter(label => values[label] !== startValues[label]);
      if (changed.length > 0) break;
    }
    if (changed.length === 0) throw new Error(`Real canvas drag did not change probe area inputs: ${JSON.stringify({ values, canvasBounds: bounds, attempts: candidates, lastEventTarget: eventTarget })}`);
    await page.screenshot({ path: path.join(artifactDir, 'visualizer-probe-area-drag-r6.png'), fullPage: true });
    const commandDelta = assertNoCncMutation(commandsBefore, 'Probe-area setup and drag');
    return { setupVisible: true, startValues, values, changedInputs: changed, dragStart: start, dragEnd: end, eventTarget, canvasVisible: await canvas.isVisible(), realCanvasDrag: true, expectedFixturePreparationCommandDelta: preparationCommandDelta, ...commandDelta };
  });

  await page.screenshot({ path: path.join(artifactDir, 'visualizer-functional-r6-final.png'), fullPage: true });
  result.directGeometryCallStacks = await page.evaluate(() => window.__r6ConsoleErrorStacks || []);
} finally {
  try {
    await page.goto('http://127.0.0.1:8080/#/administration/machine-profiles', { waitUntil: 'domcontentloaded', timeout: 15000 });
    for (const name of [profileA, profileB]) {
      const row = page.getByRole('row').filter({ hasText: name }).first();
      if (!(await row.count())) continue;
      const checkbox = row.locator('label[data-tonic="Checkbox"]');
      await checkbox.click();
      await page.getByRole('button', { name: 'Delete', exact: true }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
      await page.getByRole('row').filter({ hasText: name }).waitFor({ state: 'detached', timeout: 15000 });
    }
    result.profiles.cleanedUp = true;
  } catch (error) {
    result.profiles.cleanupError = String(error).slice(0, 500);
  }
  flush();
  await browser.close();
}
