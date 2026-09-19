const path = require('path');
const { expect } = require('@playwright/test');

/**
 * Shared setup for the visualizer's pixel tests.
 *
 * A screenshot baseline is only worth having if everything that reaches the
 * canvas is pinned. Three things are not pinned by default and each of them
 * moves every pixel in the image:
 *
 *  - the machine profile, because the grid bounds, the axis extents and the
 *    limits cuboid are all derived from it (`getCoordinateBounds`),
 *  - the widget's own persisted state — projection, camera mode and which
 *    objects are visible — which lives in the same localStorage blob and
 *    survives between runs,
 *  - the device pixel ratio, which `getRenderPixelRatio` caps at 2 but
 *    otherwise reads straight off the window.
 *
 * So the helpers below seed all three before the app's store module reads
 * localStorage, rather than trusting whatever the last manual session left
 * behind.
 */

// The store's own localStorage key (see src/app/store/index.js).
const STORE_KEY = 'cnc';

// Stamped into the seeded blob so `normalizeState` skips its version
// migrations; without it the seed is rewritten on the way in and the state
// under test is no longer the state that was asked for.
const STORE_VERSION = require('../package.json').version;

/**
 * A profile small enough that the whole envelope fits the default zoom, and
 * asymmetric in all three axes so a mirrored or transposed axis shows up as a
 * difference rather than cancelling out.
 */
const MACHINE_PROFILE = {
  id: 'e2e-visualizer',
  name: 'E2E Visualizer',
  limits: {
    xmin: 0,
    xmax: 80,
    ymin: 0,
    ymax: 60,
    zmin: -20,
    zmax: 0,
  },
};

const TOOLPATH_FIXTURE = path.join(__dirname, 'assets', 'toolpath.nc');

/**
 * Seed the persisted widget state. Must be called before the first navigation:
 * `app/store` reads localStorage once at module evaluation, so anything
 * written after the bundle has run is ignored until a reload.
 */
const seedVisualizerState = async (page) => {
  await page.addInitScript(({ key, version, machineProfile }) => {
    window.localStorage.setItem(key, JSON.stringify({
      version,
      state: {
        workspace: {
          machineProfile,
        },
        widgets: {
          visualizer: {
            minimized: false,
            disabled: false,
            projection: 'orthographic',
            cameraMode: 'pan',
            gcode: { displayName: true },
            objects: {
              limits: { visible: true },
              coordinateSystem: { visible: true },
              gridLineNumbers: { visible: true },
              cuttingTool: { visible: true },
            },
          },
        },
      },
    }));
  }, { key: STORE_KEY, version: STORE_VERSION, machineProfile: MACHINE_PROFILE });
};

const visualizerCanvas = (page) => page
  .locator('[data-widget-id="visualizer"] canvas')
  .first();

/**
 * Wait until the scene contains everything it is ever going to contain.
 *
 * The cutting tool is an STL fetched after mount, and the widget
 * only draws a frame when something asks it to — so a screenshot taken too
 * early catches a real, reproducible, and completely uninteresting
 * intermediate state. Waiting on the resource timings is exact where a fixed
 * delay would only be lucky.
 */
const SCENE_ASSETS = [
  'assets/models/stl/bit.stl',
];

const settleScene = async (page) => {
  await expect(visualizerCanvas(page)).toBeVisible();

  await expect
    .poll(() => page.evaluate((assets) => window.performance
      .getEntriesByType('resource')
      .filter((entry) => assets.some((asset) => entry.name.endsWith(asset)))
      .length, SCENE_ASSETS), { timeout: 30000 })
    .toBe(SCENE_ASSETS.length);

  // Two frames, so the render the STL promise queues has been composited
  // rather than merely requested.
  await page.evaluate(() => new Promise((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(resolve));
  }));
};

/**
 * DOM chrome that sits on top of the canvas.
 *
 * A Playwright element screenshot clips the composited page rather than
 * reading the WebGL buffer, so anything overlapping the canvas lands in the
 * image too. The workflow toolbar and the loaded file's name are both in that
 * position and neither says anything about the render, so they are masked out:
 * the toolbar's buttons change with the connection state, which would make one
 * baseline unusable across tiers, and the name is text whose antialiasing is a
 * font concern rather than a scene one.
 *
 * GCodeName renders with inline styles and no class of its own, so a caller
 * that has loaded a file passes its own locator for it through `extra`.
 */
const sceneMasks = (page, extra = []) => [
  page.locator('[class*="Visualizer/workflow-control"]'),
  ...extra,
];

/**
 * How much difference is a difference.
 *
 * These numbers were measured on this machine rather than guessed, because
 * the first guess was wrong in a way that mattered: a 2% ratio sounded
 * conservative and was, in fact, loose enough that recolouring every rapid
 * from green to red still passed. Thin, half-transparent lines cover very
 * little of a mostly-white canvas, so a ratio of the whole image is the wrong
 * unit for this scene.
 *
 * Measured against these baselines, in pixels of a ~500x565 canvas:
 *
 *   re-running the same build          0
 *   recolouring every rapid motion  ~1250
 *   the whole three 0.103 -> 0.186 port, toolpath image   799
 *   the same port, grid-only image                        140
 *
 * So the noise floor is nil — WebGL output is reproducible here — and the
 * smallest change worth calling a regression is in the hundreds. An absolute
 * allowance of 50 pixels sits an order of magnitude below that while leaving
 * room for the antialiasing jitter a driver or Chromium update may introduce.
 * If a future update moves more than that, the baselines are re-recorded on
 * purpose (delete the PNG, re-run) rather than the allowance being raised.
 *
 * `threshold` stays at its default: it governs how different one pixel has to
 * be to count, and the changes worth catching are not subtle per pixel.
 */
const SCREENSHOT_OPTIONS = {
  maxDiffPixels: 50,
  threshold: 0.2,
  animations: 'disabled',
};

module.exports = {
  MACHINE_PROFILE,
  SCENE_ASSETS,
  SCREENSHOT_OPTIONS,
  STORE_KEY,
  TOOLPATH_FIXTURE,
  sceneMasks,
  seedVisualizerState,
  settleScene,
  visualizerCanvas,
};
